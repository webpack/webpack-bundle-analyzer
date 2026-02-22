import cls from "classnames";
import PropTypes from "prop-types";

import * as styles from "./ContextMenuItem.css";

/**
 * @returns {boolean} nothing
 */
function noop() {
  return false;
}

/**
 * @typedef {object} ContextMenuItemProps
 * @property {React.ReactNode} children children
 * @property {boolean=} disabled - true when disabled, otherwise false
 * @property {React.MouseEventHandler<HTMLLIElement>=} onClick on click handler
 */

/**
 * @param {ContextMenuItemProps} props props
 * @returns {JSX.Element} context menu item
 */
export default function ContextMenuItem({ children, disabled, onClick }) {
  const className = cls({
    [styles.item]: true,
    [styles.disabled]: disabled,
  });
  const handler = disabled ? noop : onClick;
  return (
    <li className={className} onClick={handler}>
      {children}
    </li>
  );
}

ContextMenuItem.propTypes = {
  disabled: PropTypes.bool,

  children: PropTypes.node.isRequired,

  onClick: PropTypes.func,
};
