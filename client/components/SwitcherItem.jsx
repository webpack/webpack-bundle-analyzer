import Button from "./Button";
import PureComponent from "../lib/PureComponent";

export default class SwitcherItem extends PureComponent {
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
