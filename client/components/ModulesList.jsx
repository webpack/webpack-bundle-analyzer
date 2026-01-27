import cls from "classnames";
import * as s from "./ModulesList.css";
import ModuleItem from "./ModuleItem";
import PureComponent from "../lib/PureComponent";

export default class ModulesList extends PureComponent {
  render({ modules, showSize, highlightedText, isModuleVisible, className }) {
    return (
      <div className={cls(s.container, className)}>
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
