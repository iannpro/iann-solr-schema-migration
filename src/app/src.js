angular.module('iann-solr', ['ui.bootstrap', 'ngStorage', 'xml'])

    .constant("BLOCK_SIZE", 5)

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

    .controller('migrate', ['$scope', '$localStorage', '$http', 'xmlFilter', 'BLOCK_SIZE', '$timeout', function($scope, $localStorage, $http, xmlFilter, BLOCK_SIZE, $timeout) {

        $scope.$storage = $localStorage.$default({
            Url: "http://192.168.2.106/php-scripts/",
            ignore: ['id', '_version_', 'text']
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
                if ($scope.$storage.ignore.indexOf(name)===-1) {
                    var entry = {
                        name: name,
                        value: name
                    };
                    if (equalValues(oldlist, entry.value)) {
                        //TODO: assign oldName to entry
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

        var getSaveUrl = function(o, s, b) {
            return o.Url+"save.php?content="+JSON.stringify(s);
        };

        var getUpdateUrl = function(o, n) {
            return o.Url+"update.php?filename="+n;
        };

        var getPercentage = function(current, all) {
            return Math.round((current / all)*100);
        };

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
                console.log($scope.schema);
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
                console.log(value);
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
/*
        $scope.updateIgnoreList = function(items) {
            var result = [];
            angular.forEach(items, function(item, index){
                if (item.oldName) {
                    result.push(item.oldName);
                }
            });
            $scope.oldIgnoreList = result;
        };
*/

        $scope.function.select = function() {

            $http.get(getSelectUrl($scope.$storage)).
                success(function(data, status, headers, config) {
                    $scope.data = data.response;
                }).
                error(function(data, status, headers, config) {

                });
        };

        // TODO: unconsistent types
        var isUnconsistent = function (value) {
            return false;
        };

        $scope.getClass = function (value) {
            if (!value.oldName) {
                return "empty";
            } else if (isUnconsistent(value)) {
                return "unconsistent";
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
                    var send = $scope.data.docs[value];
                    console.log([value, send]);

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

