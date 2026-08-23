(() => {
  var modules = {
    123: () => "nested-module-accessor",
  };

  modules.default[123]();
})();
