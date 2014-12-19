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
        $scope.schema = { 
            New: [],
            Old: []
        };

        var getSchemeNames = function(fields) {
            var result = [];

            angular.forEach(fields, function(f, i) {
                var field = angular.element(f);
                var name = field.attr('name');
                if ($scope.$storage.ignore.indexOf(name)===-1) {
                    result.push(name);
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
            }
        , true);

        $scope.$watch('file.Old',
            function(value) {
                var xml = xmlFilter(value);
                var fields = xml.find('field');
                $scope.schema.Old = getSchemeNames(fields);
            }
            , true);

        $scope.function = {};

        $scope.function.select = function() {
            $http.get(getSelectUrl($scope.$storage)).
                success(function(data, status, headers, config) {
                    console.log(data);
                }).
                error(function(data, status, headers, config) {
                    // called asynchronously if an error occurs
                    // or server returns response with an error status.
                });
        };

    }]);

