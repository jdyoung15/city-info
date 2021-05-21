const DisplayUtils = (function() {

  /**
   * Returns the string form of the given number, properly formatted with commas.
   * E.g. 9999 -> '9,999'
   */
  function formatWithCommas(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return {
    LABEL_DEFAULT_WIDTH: '290px',

    formatWithCommas: formatWithCommas,
  };

})();
