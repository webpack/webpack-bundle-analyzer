import { observable, computed, makeObservable } from "mobx";
import { isChunkParsed, walkModules } from "./utils";
import localStorage from "./localStorage";

export class Store {
  cid = 0;
  sizes = new Set([
    "statSize",
    "parsedSize",
    "gzipSize",
    "brotliSize",
    "zstdSize",
  ]);

  allChunks;
  selectedChunks;
  searchQuery = "";
  defaultSize;
  selectedSize;
  showConcatenatedModulesContent =
    localStorage.getItem("showConcatenatedModulesContent") === true;
  darkMode = (() => {
    const systemPrefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    try {
      const saved = localStorage.getItem("darkMode");
      if (saved !== null) return saved === "true";
    } catch (e) {
      // Some browsers might not have localStorage available and we can fail silently
    }

    return systemPrefersDark;
  })();

  constructor() {
    makeObservable(this, {
      allChunks: observable.ref,
      selectedChunks: observable.shallow,
      searchQuery: observable,
      defaultSize: observable,
      selectedSize: observable,
      showConcatenatedModulesContent: observable,
      darkMode: observable,

      hasParsedSizes: computed,
      activeSize: computed,
      visibleChunks: computed,
      allChunksSelected: computed,
      totalChunksSize: computed,
      searchQueryRegexp: computed,
      isSearching: computed,
      foundModulesByChunk: computed,
      foundModules: computed,
      hasFoundModules: computed,
      hasConcatenatedModules: computed,
      foundModulesSize: computed,
    });
  }

  setModules(modules) {
    walkModules(modules, (module) => {
      module.cid = this.cid++;
    });

    this.allChunks = modules;
    this.selectedChunks = this.allChunks;
  }

  setEntrypoints(entrypoints) {
    this.entrypoints = entrypoints;
  }

  get hasParsedSizes() {
    return this.allChunks.some(isChunkParsed);
  }

  get activeSize() {
    const activeSize = this.selectedSize || this.defaultSize;

    if (!this.hasParsedSizes || !this.sizes.has(activeSize)) {
      return "statSize";
    }

    return activeSize;
  }

  get visibleChunks() {
    const visibleChunks = this.allChunks.filter((chunk) =>
      this.selectedChunks.includes(chunk),
    );

    return this.filterModulesForSize(visibleChunks, this.activeSize);
  }

  get allChunksSelected() {
    return this.visibleChunks.length === this.allChunks.length;
  }

  get totalChunksSize() {
    return this.allChunks.reduce(
      (totalSize, chunk) => totalSize + (chunk[this.activeSize] || 0),
      0,
    );
  }

  get searchQueryRegexp() {
    const query = this.searchQuery.trim();

    if (!query) {
      return null;
    }

    try {
      return new RegExp(query, "iu");
    } catch (err) {
      return null;
    }
  }

  get isSearching() {
    return !!this.searchQueryRegexp;
  }

  get foundModulesByChunk() {
    if (!this.isSearching) {
      return [];
    }

    const query = this.searchQueryRegexp;

    return this.visibleChunks
      .map((chunk) => {
        let foundGroups = [];

        walkModules(chunk.groups, (module) => {
          let weight = 0;

          /**
           * Splitting found modules/directories into groups:
           *
           * 1) Module with matched label (weight = 4)
           * 2) Directory with matched label (weight = 3)
           * 3) Module with matched path (weight = 2)
           * 4) Directory with matched path (weight = 1)
           */
          if (query.test(module.label)) {
            weight += 3;
          } else if (module.path && query.test(module.path)) {
            weight++;
          }

          if (!weight) return;

          if (!module.groups) {
            weight += 1;
          }

          const foundModules = (foundGroups[weight - 1] =
            foundGroups[weight - 1] || []);
          foundModules.push(module);
        });

        const { activeSize } = this;

        // Filtering out missing groups
        foundGroups = foundGroups.filter(Boolean).reverse();
        // Sorting each group by active size
        foundGroups.forEach((modules) =>
          modules.sort((m1, m2) => m2[activeSize] - m1[activeSize]),
        );

        return {
          chunk,
          modules: [].concat(...foundGroups),
        };
      })
      .filter((result) => result.modules.length > 0)
      .sort((c1, c2) => c1.modules.length - c2.modules.length);
  }

  get foundModules() {
    return this.foundModulesByChunk.reduce(
      (arr, chunk) => arr.concat(chunk.modules),
      [],
    );
  }

  get hasFoundModules() {
    return this.foundModules.length > 0;
  }

  get hasConcatenatedModules() {
    let result = false;

    walkModules(this.visibleChunks, (module) => {
      if (module.concatenated) {
        result = true;
        return false;
      }
    });

    return result;
  }

  get foundModulesSize() {
    return this.foundModules.reduce(
      (summ, module) => summ + module[this.activeSize],
      0,
    );
  }

  filterModulesForSize(modules, sizeProp) {
    return modules.reduce((filteredModules, module) => {
      if (module[sizeProp]) {
        if (module.groups) {
          const showContent =
            !module.concatenated || this.showConcatenatedModulesContent;

          module = {
            ...module,
            groups: showContent
              ? this.filterModulesForSize(module.groups, sizeProp)
              : null,
          };
        }

        module.weight = module[sizeProp];
        filteredModules.push(module);
      }

      return filteredModules;
    }, []);
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    try {
      localStorage.setItem("darkMode", this.darkMode);
    } catch (e) {
      // Some browsers might not have localStorage available and we can fail silently
    }
    this.updateTheme();
  }

  updateTheme() {
    if (this.darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }
}

export const store = new Store();
