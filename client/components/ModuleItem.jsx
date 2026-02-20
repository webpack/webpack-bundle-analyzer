import cls from "classnames";
import escapeRegExp from "escape-string-regexp";
import { filesize } from "filesize";
import { escape } from "html-escaper";
import PropTypes from "prop-types";
import PureComponent from "../lib/PureComponent.jsx";
import * as styles from "./ModuleItem.css";
import { ModuleType, SizeType } from "./types.js";

export default class ModuleItem extends PureComponent {
  static propTypes = {
    module: ModuleType.isRequired,
    showSize: SizeType.isRequired,
    highlightedText: PropTypes.instanceOf(RegExp),

    isVisible: PropTypes.func.isRequired,

    onClick: PropTypes.func.isRequired,
  };

  state = {
    visible: true,
  };

  render({ module, showSize }) {
    const invisible = !this.state.visible;
    const classes = cls(styles.container, styles[this.itemType], {
      [styles.invisible]: invisible,
    });

    return (
      <div
        className={classes}
        title={invisible ? this.invisibleHint : null}
        onClick={this.handleClick}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
      >
        <span dangerouslySetInnerHTML={{ __html: this.titleHtml }} />
        {showSize && (
          <>
            {" ("}
            <strong>{filesize(module[showSize])}</strong>
            {")"}
          </>
        )}
      </div>
    );
  }

  get itemType() {
    const { module } = this.props;
    if (!module.path) return "chunk";
    return module.groups ? "folder" : "module";
  }

  get titleHtml() {
    let html;
    const { module } = this.props;
    const title = module.path || module.label;
    const term = this.props.highlightedText;

    if (term) {
      const regexp =
        term instanceof RegExp
          ? new RegExp(term.source, "igu")
          : new RegExp(`(?:${escapeRegExp(term)})+`, "iu");
      let match;
      let lastMatch;

      do {
        lastMatch = match;
        match = regexp.exec(title);
      } while (match);

      if (lastMatch) {
        html = `${escape(
          title.slice(0, lastMatch.index),
        )}<strong>${escape(lastMatch[0])}</strong>${escape(
          title.slice(lastMatch.index + lastMatch[0].length),
        )}`;
      }
    }

    if (!html) {
      html = escape(title);
    }

    return html;
  }

  get invisibleHint() {
    const itemType =
      this.itemType.charAt(0).toUpperCase() + this.itemType.slice(1);
    return `${itemType} is not rendered in the treemap because it's too small.`;
  }

  get isVisible() {
    const { isVisible } = this.props;
    return isVisible ? isVisible(this.props.module) : true;
  }

  handleClick = () => this.props.onClick(this.props.module);

  handleMouseEnter = () => {
    if (this.props.isVisible) {
      this.setState({ visible: this.isVisible });
    }
  };
}
