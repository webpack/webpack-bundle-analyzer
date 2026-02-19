import cls from "classnames";
import PropTypes from "prop-types";
import PureComponent from "../lib/PureComponent.jsx";
import ModuleItem from "./ModuleItem.jsx";
import * as styles from "./ModulesList.css";
import { ModuleType, SizeType } from "./types.js";

export default class ModulesList extends PureComponent {
  static propTypes = {
    className: PropTypes.string,

    modules: PropTypes.arrayOf(ModuleType).isRequired,
    showSize: SizeType.isRequired,
    highlightedText: PropTypes.instanceOf(RegExp),

    isModuleVisible: PropTypes.func.isRequired,
    onModuleClick: PropTypes.func.isRequired,
  };

  render({ modules, showSize, highlightedText, isModuleVisible, className }) {
    return (
      <div className={cls(styles.container, className)}>
        {modules.map((module) => (
          <ModuleItem
            key={module.cid}
            module={module}
            showSize={showSize}
            highlightedText={highlightedText}
            isVisible={isModuleVisible}
            onClick={this.handleModuleClick}
          />
        ))}
      </div>
    );
  }

  handleModuleClick = (module) => this.props.onModuleClick(module);
}
