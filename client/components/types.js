import PropTypes from "prop-types";

export const GroupType = PropTypes.shape({
  cid: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  // eslint-disable-next-line new-cap
  groups: PropTypes.arrayOf((...args) => GroupType(...args)),
  statSize: PropTypes.number.isRequired,
  parsedSize: PropTypes.number.isRequired,
  gzipSize: PropTypes.number,
  brotliSize: PropTypes.number,
  zstdSize: PropTypes.number,
});

export const ViewerDataItemType = PropTypes.shape({
  cid: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  isAsset: PropTypes.bool,
  statSize: PropTypes.number.isRequired,
  parsedSize: PropTypes.number.isRequired,
  gzipSize: PropTypes.number,
  brotliSize: PropTypes.number,
  zstdSize: PropTypes.number,
  groups: PropTypes.arrayOf(GroupType).isRequired,
  isInitialByEntrypoint: PropTypes.objectOf(PropTypes.bool),
});

export const ViewerDataType = PropTypes.arrayOf(ViewerDataItemType);

export const ModuleType = PropTypes.shape({
  cid: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
  path: PropTypes.string,
  statSize: PropTypes.number.isRequired,
  parsedSize: PropTypes.number.isRequired,
  gzipSize: PropTypes.number,
  brotliSize: PropTypes.number,
  zstdSize: PropTypes.number,
  weight: PropTypes.number.isRequired,
});

export const SizeType = PropTypes.oneOf(["statSize", "parsedSize", "gzipSize"]);

export const SwitcherItemType = PropTypes.shape({
  label: PropTypes.string,
  prop: SizeType,
});
