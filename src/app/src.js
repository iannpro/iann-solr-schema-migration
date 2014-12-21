angular.module('iann-solr', ['ui.bootstrap', 'ngStorage', 'xml'])

    .constant("BLOCK_SIZE", 100)

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

    .controller('migrate', ['$scope', '$localStorage', '$http', 'xmlFilter', 'BLOCK_SIZE', function($scope, $localStorage, $http, xmlFilter, BLOCK_SIZE) {

        $scope.$storage = $localStorage.$default({
            Url: "http://192.168.2.106/php-scripts/",
            NewSchemaName: "iann-sasi",
            OldSchemaName: "iann",
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

        var getSchemeNames = function(fields) {
            var result = [];
            angular.forEach(fields, function(f, i) {
                var field = angular.element(f);
                var name = field.attr('name');
                if ($scope.$storage.ignore.indexOf(name)===-1) {
                    var entry = {
                        name: name,
                        value: name
                    };
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

        $scope.$watch('file.New',
            function(value) {
                var xml = xmlFilter(value);
                var fields = xml.find('field');
                $scope.schema.New = getSchemeNames(fields);
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
                $scope.$storage.NewSchemaName &&
                $scope.$storage.OldSchemaName &&
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
            progressCounter: null,
            savedNames: [],
            saved: []
        };

        var getSaveBlocksNr = function (all) {
            var size = BLOCK_SIZE;
            var result = [];

            for (var i = 1; i<(Math.floor(all / size)+1); i++) {
                result.push(i*size);
            }
            var rest = all % size;
            if (rest>0) {
                result.push(all);
            }
            return result;
        };

        var getSaveBlock = function (nr, docs) {
            var rest = nr % BLOCK_SIZE;
            var size = (rest === 0) ? BLOCK_SIZE : rest;
            var result = [];

            for (var i = (nr-size); i<nr; i++) {
                result.push(docs[i]);
            }

            return result;
        };

        $scope.function.save = function () {

            var blocks = getSaveBlocksNr($scope.data.numFound);

            angular.forEach(blocks, function (block) {
                var b = getSaveBlock(block, $scope.data.docs);
                //TODO: get block
            });

            var send = '{"id":"ikica","title":"iki1"}';
            $http.get(getSaveUrl($scope.$storage, send)).
                success(function(data, status, headers, config) {
                    console.log(data);
                }).
                error(function(data, status, headers, config) {
                    console.log([data,status]);
                });

        };


        $scope.function.migrate = function() {
            $scope.migrateVars.progressCounter = 0;
            //angular.forEach($scope.data.docs, function(doc, index) {
            $scope.migrateVars.pause = false;

        };

        $scope.pauseMigration = function() {
            $scope.migrateVars.pause = !$scope.migrateVars.pause;

        };

    }]);

