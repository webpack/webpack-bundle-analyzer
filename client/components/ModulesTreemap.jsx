import { filesize } from "filesize";
import { computed, makeObservable } from "mobx";
import { observer } from "mobx-react";
import { Component } from "preact";

import localStorage from "../localStorage.js";
import { store } from "../store.js";
import { isChunkParsed } from "../utils.js";
import Checkbox from "./Checkbox.jsx";
import CheckboxList from "./CheckboxList.jsx";
import ContextMenu from "./ContextMenu.jsx";
import Dropdown from "./Dropdown.jsx";
import ModulesList from "./ModulesList.jsx";
import * as styles from "./ModulesTreemap.css";
import Search from "./Search.jsx";
import Sidebar from "./Sidebar.jsx";
import Switcher from "./Switcher.jsx";
import Tooltip from "./Tooltip.jsx";
import Treemap from "./Treemap.jsx";

function getSizeSwitchItems() {
  const items = [
    { label: "Stat", prop: "statSize" },
    { label: "Parsed", prop: "parsedSize" },
  ];

  if (globalThis.compressionAlgorithm === "gzip") {
    items.push({ label: "Gzipped", prop: "gzipSize" });
  }

  if (globalThis.compressionAlgorithm === "brotli") {
    items.push({ label: "Brotli", prop: "brotliSize" });
  }

  if (globalThis.compressionAlgorithm === "zstd") {
    items.push({ label: "Zstandard", prop: "zstdSize" });
  }

  return items;
}

class ModulesTreemap extends Component {
  mouseCoords = {
    x: 0,
    y: 0,
  };

  state = {
    selectedChunk: null,
    selectedMouseCoords: { x: 0, y: 0 },
    sidebarPinned: false,
    showChunkContextMenu: false,
    showTooltip: false,
    tooltipContent: null,
  };

  constructor() {
    super();

    makeObservable(this, {
      sizeSwitchItems: computed,
      activeSizeItem: computed,
      chunkItems: computed,
      highlightedModules: computed,
      foundModulesInfo: computed,
    });
  }

  componentDidMount() {
    document.addEventListener("mousemove", this.handleMouseMove, true);
  }

  componentWillUnmount() {
    document.removeEventListener("mousemove", this.handleMouseMove, true);
  }

  render() {
    const {
      selectedChunk,
      selectedMouseCoords,
      sidebarPinned,
      showChunkContextMenu,
      showTooltip,
      tooltipContent,
    } = this.state;

    return (
      <div className={styles.container}>
        <Sidebar
          pinned={sidebarPinned}
          onToggle={this.handleSidebarToggle}
          onPinStateChange={this.handleSidebarPinStateChange}
          onResize={this.handleSidebarResize}
        >
          <div className={styles.sidebarGroup}>
            <Switcher
              label="Treemap sizes"
              items={this.sizeSwitchItems}
              activeItem={this.activeSizeItem}
              onSwitch={this.handleSizeSwitch}
            />
            {store.hasConcatenatedModules && (
              <div className={styles.showOption}>
                <Checkbox
                  checked={store.showConcatenatedModulesContent}
                  onChange={this.handleConcatenatedModulesContentToggle}
                >
                  {`Show content of concatenated modules${store.activeSize === "statSize" ? "" : " (inaccurate)"}`}
                </Checkbox>
              </div>
            )}
          </div>
          <div className={styles.sidebarGroup}>
            <Dropdown
              label="Filter to initial chunks"
              options={store.entrypoints}
              onSelectionChange={this.handleSelectionChange}
            />
          </div>
          <div className={styles.sidebarGroup}>
            <Search
              label="Search modules"
              query={store.searchQuery}
              autofocus
              onQueryChange={this.handleQueryChange}
            />
            <div className={styles.foundModulesInfo}>
              {this.foundModulesInfo}
            </div>
            {store.isSearching && store.hasFoundModules && (
              <div className={styles.foundModulesContainer}>
                {store.foundModulesByChunk.map(({ chunk, modules }) => (
                  <div key={chunk.cid} className={styles.foundModulesChunk}>
                    <div
                      className={styles.foundModulesChunkName}
                      onClick={() => this.treemap.zoomToGroup(chunk)}
                    >
                      {chunk.label}
                    </div>
                    <ModulesList
                      className={styles.foundModulesList}
                      modules={modules}
                      showSize={store.activeSize}
                      highlightedText={store.searchQueryRegexp}
                      isModuleVisible={this.isModuleVisible}
                      onModuleClick={this.handleFoundModuleClick}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          {this.chunkItems.length > 1 && (
            <div className={styles.sidebarGroup}>
              <CheckboxList
                label="Show chunks"
                items={this.chunkItems}
                checkedItems={store.selectedChunks}
                renderLabel={this.renderChunkItemLabel}
                onChange={this.handleSelectedChunksChange}
              />
            </div>
          )}
        </Sidebar>
        <Treemap
          ref={this.saveTreemapRef}
          className={styles.map}
          data={store.visibleChunks}
          highlightGroups={this.highlightedModules}
          weightProp={store.activeSize}
          onMouseLeave={this.handleMouseLeaveTreemap}
          onGroupHover={this.handleTreemapGroupHover}
          onGroupSecondaryClick={this.handleTreemapGroupSecondaryClick}
          onResize={this.handleResize}
        />
        {tooltipContent && (
          <Tooltip visible={showTooltip}>{tooltipContent}</Tooltip>
        )}
        <ContextMenu
          visible={showChunkContextMenu}
          chunk={selectedChunk}
          coords={selectedMouseCoords}
          onHide={this.handleChunkContextMenuHide}
        />
      </div>
    );
  }

  renderModuleSize(module, sizeType) {
    const sizeProp = `${sizeType}Size`;
    const size = module[sizeProp];
    const sizeLabel = getSizeSwitchItems().find(
      (item) => item.prop === sizeProp,
    ).label;
    const isActive = store.activeSize === sizeProp;

    return typeof size === "number" ? (
      <div className={isActive ? styles.activeSize : ""}>
        {sizeLabel} size: <strong>{filesize(size)}</strong>
      </div>
    ) : null;
  }

  renderChunkItemLabel = (item) => {
    const isAllItem = item === CheckboxList.ALL_ITEM;
    const label = isAllItem ? "All" : item.label;
    const size = isAllItem ? store.totalChunksSize : item[store.activeSize];

    return (
      <>
        {label} (<strong>{filesize(size)}</strong>)
      </>
    );
  };

  get sizeSwitchItems() {
    return store.hasParsedSizes
      ? getSizeSwitchItems()
      : getSizeSwitchItems().slice(0, 1);
  }

  get activeSizeItem() {
    return this.sizeSwitchItems.find((item) => item.prop === store.activeSize);
  }

  get chunkItems() {
    const { allChunks, activeSize } = store;
    let chunkItems = [...allChunks];

    if (activeSize !== "statSize") {
      chunkItems = chunkItems.filter(isChunkParsed);
    }

    chunkItems.sort(
      (chunk1, chunk2) => chunk2[activeSize] - chunk1[activeSize],
    );

    return chunkItems;
  }

  get highlightedModules() {
    return new Set(store.foundModules);
  }

  get foundModulesInfo() {
    if (!store.isSearching) {
      // `&nbsp;` to reserve space
      return "\u00A0";
    }

    if (store.hasFoundModules) {
      return (
        <>
          <div className={styles.foundModulesInfoItem}>
            Count: <strong>{store.foundModules.length}</strong>
          </div>
          <div className={styles.foundModulesInfoItem}>
            Total size: <strong>{filesize(store.foundModulesSize)}</strong>
          </div>
        </>
      );
    }

    return `Nothing found${store.allChunksSelected ? "" : " in selected chunks"}`;
  }

  handleSelectionChange = (selected) => {
    if (!selected) {
      store.setSelectedChunks(store.allChunks);
      return;
    }

    store.setSelectedChunks(
      store.allChunks.filter(
        (chunk) => chunk.isInitialByEntrypoint[selected] ?? false,
      ),
    );
  };

  handleConcatenatedModulesContentToggle = (flag) => {
    store.showConcatenatedModulesContent = flag;
    if (flag) {
      localStorage.setItem("showConcatenatedModulesContent", true);
    } else {
      localStorage.removeItem("showConcatenatedModulesContent");
    }
  };

  handleChunkContextMenuHide = () => {
    this.setState({
      showChunkContextMenu: false,
    });
  };

  handleResize = () => {
    // Close any open context menu when the report is resized,
    // so it doesn't show in an incorrect position
    if (this.state.showChunkContextMenu) {
      this.setState({
        showChunkContextMenu: false,
      });
    }
  };

  handleSidebarToggle = () => {
    if (this.state.sidebarPinned) {
      setTimeout(() => this.treemap.resize());
    }
  };

  handleSidebarPinStateChange = (pinned) => {
    this.setState({ sidebarPinned: pinned });
    setTimeout(() => this.treemap.resize());
  };

  handleSidebarResize = () => {
    this.treemap.resize();
  };

  handleSizeSwitch = (sizeSwitchItem) => {
    store.setSelectedSize(sizeSwitchItem.prop);
  };

  handleQueryChange = (query) => {
    store.setSearchQuery(query);
  };

  handleSelectedChunksChange = (selectedChunks) => {
    store.setSelectedSize(selectedChunks);
  };

  handleMouseLeaveTreemap = () => {
    this.setState({ showTooltip: false });
  };

  handleTreemapGroupSecondaryClick = (event) => {
    const { group } = event;

    if (group && group.isAsset) {
      this.setState({
        selectedChunk: group,
        selectedMouseCoords: { ...this.mouseCoords },
        showChunkContextMenu: true,
      });
    } else {
      this.setState({
        selectedChunk: null,
        showChunkContextMenu: false,
      });
    }
  };

  handleTreemapGroupHover = (event) => {
    const { group } = event;

    if (group) {
      this.setState({
        showTooltip: true,
        tooltipContent: this.getTooltipContent(group),
      });
    } else {
      this.setState({ showTooltip: false });
    }
  };

  handleFoundModuleClick = (module) => this.treemap.zoomToGroup(module);

  handleMouseMove = (event) => {
    Object.assign(this.mouseCoords, {
      x: event.pageX,
      y: event.pageY,
    });
  };

  isModuleVisible = (module) => this.treemap.isGroupRendered(module);

  saveTreemapRef = (treemap) => (this.treemap = treemap);

  getTooltipContent(module) {
    if (!module) return null;

    return (
      <div>
        <div>
          <strong>{module.label}</strong>
        </div>
        <br />
        {this.renderModuleSize(module, "stat")}
        {!module.inaccurateSizes && this.renderModuleSize(module, "parsed")}
        {!module.inaccurateSizes &&
          this.renderModuleSize(module, globalThis.compressionAlgorithm)}
        {module.path && (
          <div>
            Path: <strong>{module.path}</strong>
          </div>
        )}
        {module.isAsset && (
          <div>
            <br />
            <strong>
              <em>Right-click to view options related to this chunk</em>
            </strong>
          </div>
        )}
      </div>
    );
  }
}

export default observer(ModulesTreemap);
