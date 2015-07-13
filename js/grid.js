/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Define various fixed dimensions
 */
const GRID_BOTTOM_EXTRA = 7; // title's line-height extends 7px past the margin
const GRID_WIDTH_EXTRA = 1; // provide 1px buffer to allow for rounding error

/**
 * This singleton represents the grid that contains all sites.
 */
let gGrid = {
  /**
   * The DOM node of the grid.
   */
  _node: null,
  get node() { return this._node; },

  /**
   * The cached DOM fragment for sites.
   */
  _siteFragment: null,

  /**
   * All cells contained in the grid.
   */
  _cells: [],
  get cells() { return this._cells; },

  /**
   * All sites contained in the grid's cells. Sites may be empty.
   */
  get sites() { return [for (cell of this.cells) cell.site]; },

  // Tells whether the grid has already been initialized.
  get ready() { return !!this._ready; },

  // Returns whether the page has finished loading yet.
  get isDocumentLoaded() { return document.readyState == "complete"; },

  // The currently pinned links.
  _pinnedLinks: [],

  /**
   * Initializes the grid.
   * @param aSelector The query selector of the grid.
   */
  init: function Grid_init() {
    this._node = document.getElementById("newtab-grid");
    this._createSiteFragment();
    addEventListener("resize", this);

    sendToBrowser("NewTab:InitializeGrid");
    registerListener("NewTab:UpdateLinks", this.refresh.bind(this));

    // Resize the grid as soon as the page loads.
    if (!this.isDocumentLoaded) {
      addEventListener("load", this);
    }
  },

  /**
   * Creates a new site in the grid.
   * @param aLink The new site's link.
   * @param aCell The cell that will contain the new site.
   * @return The newly created site.
   */
  createSite: function Grid_createSite(aLink, aCell) {
    let node = aCell.node;
    node.appendChild(this._siteFragment.cloneNode(true));
    return new Site(node.firstElementChild, aLink);
  },

  /**
   * Handles all grid events.
   */
  handleEvent: function Grid_handleEvent(aEvent) {
    switch (aEvent.type) {
      case "load":
      case "resize":
        this._resizeGrid();
        break;
    }
  },

  /**
   * Locks the grid to block all pointer events.
   */
  lock: function Grid_lock() {
    this.node.setAttribute("locked", "true");
  },

  /**
   * Unlocks the grid to allow all pointer events.
   */
  unlock: function Grid_unlock() {
    this.node.removeAttribute("locked");
  },

  /**
   * Renders the grid, including cells and sites.
   */
  refresh: function(message) {
    let links = message.links;
    let cell = document.createElementNS(HTML_NAMESPACE, "div");
    cell.classList.add("newtab-cell");

    // Creates all the cells up to the maximum
    let fragment = document.createDocumentFragment();
    //let rows = Math.max(1, Services.prefs.getIntPref("browser.newtabpage.rows"));
    //let columns = Math.max(1, Services.prefs.getIntPref("browser.newtabpage.columns"));
    for (let i = 0; i < 15/*columns * rows*/; i++) {
      fragment.appendChild(cell.cloneNode(true));
    }

    // Create cells.
    let cells = [new Cell(this, cell) for (cell of fragment.childNodes)];

    // Create sites.
    let numLinks = Math.min(links.length, cells.length);
    for (let i = 0; i < numLinks; i++) {
      if (links[i]) {
        this.createSite(links[i], cells[i]);
      }
    }

    this._cells = cells;
    this._node.innerHTML = "";
    this._node.appendChild(fragment);
    this._ready = true;

    this._pinnedLinks = message.data.pinnedLinks;

    // If fetching links took longer than loading the page itself then
    // we need to resize the grid as that was blocked until now.
    // We also want to resize now if the page was already loaded when
    // initializing the grid (the user toggled the page).
    this._resizeGrid();

    let event = new CustomEvent("AboutNewTabUpdated", {bubbles: true});
    document.dispatchEvent(event);
  },

  /**
   * Calculate the height for a number of rows up to the maximum rows
   * @param rows Number of rows defaulting to the max
   */
  _computeHeight: function Grid_computeHeight(aRows) {
    //let {gridRows} = gGridPrefs;
    let gridRows = 3;
    aRows = aRows === undefined ? gridRows : Math.min(gridRows, aRows);
    return aRows * this._cellHeight + GRID_BOTTOM_EXTRA;
  },

  /**
   * Creates the DOM fragment that is re-used when creating sites.
   */
  _createSiteFragment: function Grid_createSiteFragment() {
    let site = document.createElementNS(HTML_NAMESPACE, "div");
    site.classList.add("newtab-site");
    site.setAttribute("draggable", "true");

    // Create the site's inner HTML code.
    site.innerHTML =
      '<span class="newtab-sponsored">' + newTabString("sponsored.button") + '</span>' +
      '<a class="newtab-link">' +
      '  <span class="newtab-thumbnail"></span>' +
      '  <span class="newtab-thumbnail enhanced-content"></span>' +
      '  <span class="newtab-title"></span>' +
      '</a>' +
      '<input type="button" title="' + newTabString("pin") + '"' +
      '       class="newtab-control newtab-control-pin"/>' +
      '<input type="button" title="' + newTabString("block") + '"' +
      '       class="newtab-control newtab-control-block"/>' +
      '<span class="newtab-suggested"></span>';

    this._siteFragment = document.createDocumentFragment();
    this._siteFragment.appendChild(site);
  },

  /**
   * Make sure the correct number of rows and columns are visible
   */
  _resizeGrid: function Grid_resizeGrid() {
    // If we're somehow called before the page has finished loading,
    // let's bail out to avoid caching zero heights and widths.
    // We'll be called again when DOMContentLoaded fires.
    // Same goes for the grid if that's not ready yet.
    if (!this.isDocumentLoaded || !this._ready) {
      return;
    }

    // Save the cell's computed height/width including margin and border
    if (this._cellMargin === undefined) {
      let refCell = document.querySelector(".newtab-cell");
      this._cellMargin = parseFloat(getComputedStyle(refCell).marginTop);
      this._cellHeight = refCell.offsetHeight + this._cellMargin +
        parseFloat(getComputedStyle(refCell).marginBottom);
      this._cellWidth = refCell.offsetWidth + this._cellMargin;
    }

    let availSpace = document.documentElement.clientHeight - this._cellMargin -
                     document.querySelector("#newtab-search-container").offsetHeight;
    let visibleRows = Math.floor(availSpace / this._cellHeight);
    let columns = 5; //Math.max(1, Services.prefs.getIntPref("browser.newtabpage.columns"));
    this._node.style.height = this._computeHeight() + "px";
    this._node.style.maxHeight = this._computeHeight(visibleRows) + "px";
    this._node.style.maxWidth = columns* this._cellWidth +
                                GRID_WIDTH_EXTRA + "px";
  }
};
