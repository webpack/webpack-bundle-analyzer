const marker = true;

(() => {
  var modules = {
    123: () => "top-level-fallback",
  };

  noop();

  return modules;
})();
