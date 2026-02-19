// TODO: switch to a more modern debounce package once we drop Node.js 10 support
import debounce from "debounce";

import PropTypes from "prop-types";
import PureComponent from "../lib/PureComponent.jsx";
import Button from "./Button.jsx";

import * as styles from "./Search.css";

export default class Search extends PureComponent {
  static propTypes = {
    className: PropTypes.string,

    label: PropTypes.string.isRequired,
    query: PropTypes.string.isRequired,

    autofocus: PropTypes.bool,

    onQueryChange: PropTypes.func.isRequired,
  };

  componentDidMount() {
    if (this.props.autofocus) {
      this.focus();
    }
  }

  componentWillUnmount() {
    this.handleValueChange.clear();
  }

  render() {
    const { label, query } = this.props;

    return (
      <div className={styles.container}>
        <div className={styles.label}>{label}:</div>
        <div className={styles.row}>
          <input
            ref={this.saveInputNode}
            className={styles.input}
            type="text"
            value={query}
            placeholder="Enter regexp"
            onInput={this.handleValueChange}
            onBlur={this.handleInputBlur}
            onKeyDown={this.handleKeyDown}
          />
          <Button className={styles.clear} onClick={this.handleClearClick}>
            x
          </Button>
        </div>
      </div>
    );
  }

  handleValueChange = debounce((event) => {
    this.informChange(event.target.value);
  }, 400);

  handleInputBlur = () => {
    this.handleValueChange.flush();
  };

  handleClearClick = () => {
    this.clear();
    this.focus();
  };

  handleKeyDown = (event) => {
    let handled = true;

    switch (event.key) {
      case "Escape":
        this.clear();
        break;
      case "Enter":
        this.handleValueChange.flush();
        break;
      default:
        handled = false;
    }

    if (handled) {
      event.stopPropagation();
    }
  };

  focus() {
    if (this.input) {
      this.input.focus();
    }
  }

  clear() {
    this.handleValueChange.clear();
    this.informChange("");
    this.input.value = "";
  }

  informChange(value) {
    this.props.onQueryChange(value);
  }

  saveInputNode = (node) => (this.input = node);
}
