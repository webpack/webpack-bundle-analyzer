import cls from "classnames";
import PureComponent from "../lib/PureComponent.jsx";

import * as styles from "./Button.css";

export default class Button extends PureComponent {
  render({ active, className, children, ...props }) {
    const classes = cls(className, {
      [styles.button]: true,
      [styles.active]: active,
    });

    return (
      <button
        {...props}
        ref={this.saveRef}
        type="button"
        className={classes}
        disabled={this.disabled}
        onClick={this.handleClick}
      >
        {children}
      </button>
    );
  }

  get disabled() {
    const { props } = this;
    return props.disabled || (props.active && !props.toggle);
  }

  handleClick = (event) => {
    this.elem.blur();
    this.props.onClick(event);
  };

  saveRef = (elem) => (this.elem = elem);
}
