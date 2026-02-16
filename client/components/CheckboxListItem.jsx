import { Component } from "preact";

import Checkbox from "./Checkbox.jsx";
import * as styles from "./CheckboxList.css";
import CheckboxList from "./CheckboxList.jsx";

export default class CheckboxListItem extends Component {
  render() {
    return (
      <div className={styles.item}>
        <Checkbox {...this.props} onChange={this.handleChange}>
          {this.renderLabel()}
        </Checkbox>
      </div>
    );
  }

  renderLabel() {
    const { children, item } = this.props;

    if (children) {
      return children(item);
    }

    return item === CheckboxList.ALL_ITEM ? "All" : item.label;
  }

  handleChange = () => {
    this.props.onChange(this.props.item);
  };
}
