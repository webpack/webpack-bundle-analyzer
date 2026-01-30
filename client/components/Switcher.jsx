import SwitcherItem from "./SwitcherItem";
import * as s from "./Switcher.css";
import PureComponent from "../lib/PureComponent";

export default class Switcher extends PureComponent {
  render() {
    const { label, items, activeItem, onSwitch } = this.props;

    return (
      <div className={s.container}>
        <div className={s.label}>{label}:</div>
        <div>
          {items.map((item) => (
            <SwitcherItem
              key={item.label}
              className={s.item}
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
