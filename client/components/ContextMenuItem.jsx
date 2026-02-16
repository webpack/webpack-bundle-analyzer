import cls from "classnames";

import * as styles from "./ContextMenuItem.css";

function noop() {
  return false;
}

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
