import PureComponent from "../lib/PureComponent.jsx";
import SwitcherItem from "./SwitcherItem.jsx";

import * as styles from "./Switcher.css";

export default class Switcher extends PureComponent {
  render() {
    const { label, items, activeItem, onSwitch } = this.props;

    return (
      <div className={styles.container}>
        <div className={styles.label}>{label}:</div>
        <div>
          {items.map((item) => (
            <SwitcherItem
              key={item.label}
              className={styles.item}
              item={item}
              active={item === activeItem}
              onClick={onSwitch}
            />
          ))}
        </div>
      </div>
    );
  }
}
