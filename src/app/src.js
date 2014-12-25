angular.module('iann-solr', ['ui.bootstrap', 'ngStorage', 'xml'])

    .constant("CONST", {
        xmlTypes: {
            boolean: ['boolean'],
            number: ['long', 'double'],
            string: ['text', 'string', 'text_lowercase'],
            date: ['tdate']
        }
    })

    .directive("fileread", [function () {
        return {
            scope: {
                fileread: "="
            },
            link: function (scope, element, attributes) {
                element.bind("change", function (changeEvent) {
                    var reader = new FileReader();
                    reader.onload = function (loadEvent) {
                        scope.$apply(function () {
                            scope.fileread = loadEvent.target.result;
                        });
                    };
                    reader.readAsText(changeEvent.target.files[0]);
                });
            }
        }
    }])

    .factory('$transform', ['CONST', function(CONST) {
        var functions = {};

        functions.getType = function(value) {
            var type = typeof value;
            if (type === 'object' && Array.isArray(value)) {
                type = 'array';
            }
            return type;
        };

        functions.getXmlType = function(type, multiValued) {
            var text = [];

            if (multiValued) {
                text.push('array');
            }

            if (CONST.xmlTypes.string.indexOf(type)!==-1) {
                text.push('string')
            } else if (CONST.xmlTypes.number.indexOf(type)!==-1) {
                text.push('number');
            } else if (CONST.xmlTypes.boolean.indexOf(type)!==-1) {
                text.push('boolean');
            } else if (CONST.xmlTypes.date.indexOf(type)!==-1) {
                text.push('date');
            }

            return text;
        };

        functions.transform = function (data, obj) {

            if (data[obj.oldName]) {
                var result = undefined;
                var type = functions.getType(data[obj.oldName]);

                // TODO: does not check values inside array if they correspond to target object
                if (obj.type.indexOf('array')!==-1) {
                    if (type === 'array') {
                        result = data[obj.oldName];
                    } else {
                        result = [];
                        result.push(data[obj.oldName]);
                    }
                }
                // TODO: does not transform other types to object (default = {})
                else if (obj.type.indexOf('object')!==-1) {
                    if (type === 'object') {
                        result = data[obj.oldName];
                    } else {
                        result = {};
                    }
                }
                // TODO: does not transform other types to date (default 'undefined')
                else if (obj.type.indexOf('date')!==-1) {
                    // do nothing... result = undefined;
                }
                // TODO: does not transform objects and arrays to number (default = 0)
                else if (obj.type.indexOf('number')!==-1) {
                    if (type === 'number') {
                        result = data[obj.oldName];
                    } else if (type === 'string'){
                        result = parseFloat(data[obj.oldName]);
                    } else if (type === 'boolean') {
                        result = (data[obj.oldName]>0)?1:0;
                    } else { // date cannot be converted to number
                        result = 0;
                    }
                }
                // TODO: does not transform objects, arrays and numbers to boolean (default = false)
                else if (obj.type.indexOf('boolean')!==-1) {
                    if (type === 'boolean') {
                        result = data[obj.oldName];
                    } else if (type === 'string'){
                        result = (data[obj.oldName] === 'true');
                    } else {
                        result = false;
                    }
                } else if (obj.type.indexOf('string')!==-1) {
                    if (type === 'string' || type === 'date') {
                        result = data[obj.oldName];
                    } else if (type === 'number' || type === 'boolean'){
                        result = data[obj.oldName].toString();
                    } else if (type === 'array' || type === 'object') {
                        result = "";
                        angular.forEach(data[obj.oldName], function (el) {
                            result+= el + " ";
                        });
                    } else {
                        result = "";
                    }
                }
                return result;
                //return data[obj.oldName];
            } else {
                return functions.getEmptyValue(obj.type);
            }


        };

        functions.getEmptyValue = function (value) {
            var result = "";
            if (value.indexOf('array')!==-1) {
                result = [];
            } else if (value.indexOf('object')!==-1) {
                result = {};
            } else if (value.indexOf('number')!==-1) {
                result = 0;
            } else if (value.indexOf('boolean')!==-1) {
                result = false;
            } else if (value.indexOf('string')!==-1) {
                result = "";
            } else if (value.indexOf('date')!==-1) {
                result = undefined;
            }
            return result;
        };

        functions.assign = function (data, schema) {
            var result = {};
            angular.forEach(schema, function(value) {
                var r;
                if (value.oldName) {
                    r = functions.transform(data, value);
                } else {
                    r = functions.getEmptyValue(value.type);
                }
                if (r !== undefined) result[value.name] = r;
            });
            return result;
        };

        return functions;
    }])

    .controller('migrate', ['$scope', '$localStorage', '$http', 'xmlFilter', '$timeout', '$transform', function($scope, $localStorage, $http, xmlFilter, $timeout, $transform) {

        $scope.$storage = $localStorage.$default({
            Url: "http://192.168.2.106/php-scripts/",
            ignore: ['_version_']
        });

        $scope.file = {};
        $scope.function = {};
        $scope.data = {
            docs: [],
            numFound: 0
        };
        $scope.schema = {
            New: [],
            Old: []
        };
        $scope.naviControl = "configure";
        $scope.validation = {
            fetch: false,
            migrate: false
        };
        $scope.oldIgnoreList = []; // will be filled after changing select values

        var equalValues = function (o, v) {
            var result = false;
            angular.forEach(o, function (old) {
                if (old.value === v) {
                    result = true;
                }
            });
            return result;
        };

        var getSchemeNames = function(fields, oldlist) {
            var result = [];
            angular.forEach(fields, function(f, i) {
                var field = angular.element(f);
                var name = field.attr('name');
                var multiValued = field.attr('multiValued');
                var type = field.attr('type');
                if ($scope.$storage.ignore.indexOf(name)===-1) {
                    var entry = {
                        name: name,
                        value: name,
                        type: $transform.getXmlType(type, multiValued)
                    };
                    if (equalValues(oldlist, entry.value)) {
                        entry.oldName = name;
                    }
                    result.push(entry);
                }
            });
            return result;
        };

        var getSelectUrl = function(o) {
            return o.Url+"select.php";
        };

        var getSaveUrl = function(o, s) {
            return o.Url+"save.php?content="+JSON.stringify(s);
        };

        var getUpdateUrl = function(o, n) {
            return o.Url+"update.php?filename="+n;
        };

        var getPercentage = function(current, all) {
            return Math.round((current / all)*100);
        };

        $scope.$watch('schema',
            function(value) {
                console.log($scope.schema);
            }
            , true);

        $scope.$watch('file.New',
            function(value) {
                var xml = xmlFilter(value);
                var fields = xml.find('field');
                $scope.schema.New = getSchemeNames(fields, $scope.schema.Old);
                $scope.validConfigure();
            }
        , true);

        $scope.$watch('file.Old',
            function(value) {
                var xml = xmlFilter(value);
                var fields = xml.find('field');
                $scope.schema.Old = getSchemeNames(fields);
                $scope.validConfigure();
            }
            , true);

        $scope.validConfigure = function() {
            var result = false;
            if ($scope.$storage.Url &&
                $scope.file.New &&
                $scope.file.Old) {
                result = true;
            }
            $scope.validation.fetch = result;
        };

        $scope.validFetch = function() {
            var result = false;
            if ($scope.data.numFound>0) {
                result = true;
            }
            $scope.validation.migrate = result;
        };

        $scope.$watch('naviControl',
            function(value) {
                switch(value) {
                    case "configure":
                            $scope.validConfigure();
                        break;
                    case "fetch":
                            $scope.validFetch();
                        break;
                    case "migrate":
                        break;
                }
            });

        $scope.$watch('data',
            function(value) {

                $scope.validFetch();
            }, true);


        $scope.function.select = function() {

            $http.get(getSelectUrl($scope.$storage)).
                success(function(data, status, headers, config) {
                    $scope.data = data.response;
                }).
                error(function(data, status, headers, config) {

                });
        };

        var arraysEqual = function(a1, a2) {
            if (typeof a1 !== typeof a2) return false;
            if (a1.length !== a2.length) return false;

            var result = false;
            angular.forEach(a1, function (o1) {
                angular.forEach(a2, function (o2) {
                    if (o1 === o2) {
                        result = true;
                    }
                });
            });

            return result;
        };

        var isUnconsistent = function (value) {
            var result = false;
            angular.forEach($scope.schema.Old, function (el) {
                if (value.oldName === el.name) {
                    if (!arraysEqual(el.type, value.type)) {
                        result = true;
                    }
                }
            });
            return result;
        };

        $scope.getClass = function (value) {
            if (!value.oldName) {
                return "empty";
            } else if (isUnconsistent(value)) {
                return "conditional-unconsistent";
            } else {
                return "ok";
            }
        };


        $scope.migrateVars = {
            progressCompleted: 0,
            progressCounter: null
        };



        $scope.$watch('migrateVars.progressCounter',
            function(value) {
                if (value || $scope.data.numFound>0) {
                    $scope.migrateVars.progressCompleted = getPercentage(value, $scope.data.numFound);
                }
                console.log("progress "+value);
                if (!isNaN(value) && (value<$scope.data.numFound-1)) {

                    $http.get(getSelectUrl($scope.$storage)).
                        success(function(data, status, headers, config) {
                            $scope.data = data.response;
                            $scope.migrateVars.progressCounter++;
                        }).
                        error(function(data, status, headers, config) {
                            $scope.migrateVars.progressCounter++;
                        });

                }
            });


        $scope.saveVars = {
            progressCompleted: 0,
            counter: undefined,
            locked: false,
            saved: []
        };



        var tick = function () {
            if ($scope.saveVars.counter < $scope.data.numFound-1) {
                $scope.saveVars.counter++;
            } else {
                $scope.saveVars.locked = false;
            }
        };

        $scope.$watch('saveVars.counter',
            function(value) {

                if (!isNaN(value)) {
                    var send = $transform.assign($scope.data.docs[value], $scope.schema.New);

                    $http.get(getSaveUrl($scope.$storage, send)).
                        success(function(data, status, headers, config) {
                            $scope.saveVars.saved.push(send.id);
                            tick();
                        }).
                        error(function(data, status, headers, config) {
                            tick();
                        });


                } else {
                    console.log("saveVars.counter is: "+value);
                }
            });


        $scope.$watch('saveVars.counter',
            function(value) {
                if (!isNaN(value)) {
                    $scope.saveVars.progressCompleted = getPercentage(value, $scope.data.numFound);
                }
            });

        $scope.function.save = function () {

            if ($scope.saveVars.locked) {
                $scope.saveVars.counter = undefined;
                $scope.saveVars.progressCompleted = 0;
                $scope.saveVars.saved = [];
            } else {
                $scope.saveVars.saved = [];
                $scope.saveVars.counter = 0;
            }

            $scope.saveVars.locked = !$scope.saveVars.locked;


        };



        $scope.function.migrate = function() {
            //$scope.migrateVars.progressCounter = 0;
            //angular.forEach($scope.data.docs, function(doc, index) {
            //$scope.migrateVars.pause = false;

            $http.get(getUpdateUrl($scope.$storage, "760cd11b-241c-4d38-b2b1-bcb2ff2863df")).
                success(function(data, status, headers, config) {
                    console.log(data);
                }).
                error(function(data, status, headers, config) {

                });

        };

        $scope.pauseMigration = function() {
            $scope.migrateVars.pause = !$scope.migrateVars.pause;

        };

    }]);

