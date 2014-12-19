angular.module('iann-solr', ['ui.bootstrap', 'ngStorage', 'xml'])

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

    .controller('migrate', ['$scope', '$localStorage', '$http', 'xmlFilter', function($scope, $localStorage, $http, xmlFilter) {

        $scope.$storage = $localStorage.$default({
            Url: "http://192.168.2.106:8983/solr/",
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
            return "http://192.168.2.106/php-scripts/select.php";
            //return o.Url+o.OldSchemaName + "/select?q=*%3A*&wt=json&indent=true&rows=2147483647";
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
            progressCounter: null,
            pause: false,
            complete: true
        };
        $scope.progressCompleted = 0;
        $scope.progressCounter = null;

        $scope.$watch('progressCounter',
            function(value) {
                if (value!==0 || $scope.data.numFound!==0) {
                    $scope.progressCompleted = Math.round((value / $scope.data.numFound)*100);
                }
                console.log("progress "+value);
                if (!isNaN(value) && (value<$scope.data.numFound-1)) {
                    if (!$scope.migrateVars.pause) {
                        $http.get(getSelectUrl($scope.$storage)).
                            success(function(data, status, headers, config) {
                                $scope.data = data.response;
                                $scope.progressCounter++;
                            }).
                            error(function(data, status, headers, config) {
                                $scope.progressCounter++;
                            });
                    }

                }
            });



        $scope.function.migrate = function() {
            $scope.progressCounter = 0;
            //angular.forEach($scope.data.docs, function(doc, index) {
            $scope.migrateVars.pause = false;

        };

        $scope.pauseMigration = function() {
            $scope.migrateVars.pause = !$scope.migrateVars.pause;

        };

    }]);

