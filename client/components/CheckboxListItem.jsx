import { Component } from "preact";
import PropTypes from "prop-types";

import Checkbox from "./Checkbox.jsx";
import * as styles from "./CheckboxList.css";
import CheckboxList from "./CheckboxList.jsx";
import { ViewerDataItemType } from "./types.js";

export default class CheckboxListItem extends Component {
  static propTypes = {
    item: PropTypes.oneOfType([ViewerDataItemType, PropTypes.symbol])
      .isRequired,

    onChange: PropTypes.func.isRequired,

    children: PropTypes.func,
  };

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
