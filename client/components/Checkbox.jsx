import { Component } from "preact";
import cls from "classnames";

import s from "./Checkbox.css";

export default class Checkbox extends Component {
  render() {
    const { checked, className, children } = this.props;

    return (
      <label className={cls(s.label, className)}>
        <input
          className={s.checkbox}
          type="checkbox"
          checked={checked}
          onChange={this.handleChange}
        />
        <span className={s.itemText}>{children}</span>
      </label>
    );
  }

  handleChange = () => {
    this.props.onChange(!this.props.checked);
  };
}
