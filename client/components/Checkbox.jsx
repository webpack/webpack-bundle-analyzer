import cls from "classnames";
import { Component } from "preact";
import PropTypes from "prop-types";

import * as styles from "./Checkbox.css";

export default class Checkbox extends Component {
  static propTypes = {
    className: PropTypes.string,

    checked: PropTypes.bool,

    onChange: PropTypes.func.isRequired,

    children: PropTypes.node,
  };

  render() {
    const { checked, className, children } = this.props;

    return (
      <label className={cls(styles.label, className)}>
        <input
          className={styles.checkbox}
          type="checkbox"
          checked={checked}
          onChange={this.handleChange}
        />
        {children && <span className={styles.itemText}>{children}</span>}
      </label>
    );
  }

  handleChange = () => {
    this.props.onChange(!this.props.checked);
  };
}
