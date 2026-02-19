import PropTypes from "prop-types";
import PureComponent from "../lib/PureComponent.jsx";
import * as styles from "./Switcher.css";
import SwitcherItem from "./SwitcherItem.jsx";
import { SwitcherItemType } from "./types.js";

export default class Switcher extends PureComponent {
  static propTypes = {
    label: PropTypes.string.isRequired,

    items: PropTypes.arrayOf(SwitcherItemType).isRequired,
    activeItem: SwitcherItemType.isRequired,

    onSwitch: PropTypes.func.isRequired,
  };

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
