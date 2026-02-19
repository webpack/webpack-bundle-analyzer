import { createRef } from "preact";
import PropTypes from "prop-types";
import PureComponent from "../lib/PureComponent.jsx";

import * as styles from "./Dropdown.css";

export default class Dropdown extends PureComponent {
  static propTypes = {
    label: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.string).isRequired,
    onSelectionChange: PropTypes.func.isRequired,
  };

  input = createRef();

  state = {
    query: "",
    showOptions: false,
  };

  componentDidMount() {
    document.addEventListener("click", this.handleClickOutside, true);
  }

  componentWillUnmount() {
    document.removeEventListener("click", this.handleClickOutside, true);
  }

  render() {
    const { label, options } = this.props;

    const filteredOptions = this.state.query
      ? options.filter((option) =>
          option.toLowerCase().includes(this.state.query.toLowerCase()),
        )
      : options;

    return (
      <div className={styles.container}>
        <div className={styles.label}>{label}:</div>
        <div>
          <input
            ref={this.input}
            className={styles.input}
            type="text"
            value={this.state.query}
            onInput={this.handleInput}
            onFocus={this.handleFocus}
          />
          {this.state.showOptions ? (
            <div>
              {filteredOptions.map((option) => (
                <div
                  key={option}
                  className={styles.option}
                  onClick={this.getOptionClickHandler(option)}
                >
                  {option}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  handleClickOutside = (event) => {
    const el = this.input.current;
    if (el && event && !el.contains(event.target)) {
      this.setState({ showOptions: false });
      // If the query is not in the options, reset the selection
      if (this.state.query && !this.props.options.includes(this.state.query)) {
        this.setState({ query: "" });
        this.props.onSelectionChange(undefined);
      }
    }
  };

  handleInput = (event) => {
    const { value } = event.target;
    this.setState({ query: value });
    if (!value) {
      this.props.onSelectionChange(undefined);
    }
  };

  handleFocus = () => {
    // move the cursor to the end of the input
    this.input.current.value = this.state.query;
    this.setState({ showOptions: true });
  };

  getOptionClickHandler = (option) => () => {
    this.props.onSelectionChange(option);
    this.setState({ query: option, showOptions: false });
  };
}
