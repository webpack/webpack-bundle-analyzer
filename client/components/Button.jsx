import cls from "classnames";
import PropTypes from "prop-types";
import PureComponent from "../lib/PureComponent.jsx";

import * as styles from "./Button.css";

export default class Button extends PureComponent {
  static propTypes = {
    className: PropTypes.string,

    active: PropTypes.bool,
    toggle: PropTypes.bool,
    disabled: PropTypes.bool,

    onClick: PropTypes.func.isRequired,

    children: PropTypes.node,
  };

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
    const { disabled, active, toggle } = this.props;
    return disabled || (active && !toggle);
  }

  handleClick = (event) => {
    if (this.elem) {
      this.elem.blur();
    }

    this.props.onClick(event);
  };

  saveRef = (elem) => (this.elem = elem);
}
