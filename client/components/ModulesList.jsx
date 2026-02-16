import cls from "classnames";
import PureComponent from "../lib/PureComponent.jsx";
import ModuleItem from "./ModuleItem.jsx";

import * as styles from "./ModulesList.css";

export default class ModulesList extends PureComponent {
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
