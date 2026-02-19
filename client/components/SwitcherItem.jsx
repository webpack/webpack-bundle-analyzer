import PropTypes from "prop-types";
import PureComponent from "../lib/PureComponent.jsx";
import Button from "./Button.jsx";
import { SwitcherItemType } from "./types.js";

export default class SwitcherItem extends PureComponent {
  static propTypes = {
    active: PropTypes.bool.isRequired,

    item: SwitcherItemType.isRequired,

    onClick: PropTypes.func.isRequired,
  };

  render({ item, ...props }) {
    return (
      <Button {...props} onClick={this.handleClick}>
        {item.label}
      </Button>
    );
  }

  handleClick = () => {
    this.props.onClick(this.props.item);
  };
}
