const constants = {
  MAX_TILES: 15
};

// Add action names
[
  "REQUEST_SCREENSHOT",
  "RECEIVE_SCREENSHOT",
  "REQUEST_SUGGESTED_DIRECTORY",
  "RECEIVE_SUGGESTED_DIRECTORY",
  "REQUEST_PREFS",
  "RECEIVE_PREFS",
  "RECEIVE_UPDATE_SITES",
  "UPDATE_SEARCH_STRING",
  "REQUEST_UISTRINGS",
  "RECEIVE_UISTRINGS",
  "REQUEST_SEARCH_SUGGESTIONS",
  "RECEIVE_SEARCH_SUGGESTIONS",
  "REQUEST_MANAGE_ENGINES",
  "REQUEST_SEARCH_STATE",
  "RECEIVE_SEARCH_STATE",
  "REQUEST_REMOVE_FORM_HISTORY",
  "REQUEST_PERFORM_SEARCH",
  "RECEIVE_CURRENT_ENGINE",
  "REQUEST_CYCLE_ENGINE",
  "REQUEST_FRECENT",
  "RECEIVE_FRECENT",
  "REQUEST_INIT_USER_DATABASE",
  "REQUEST_INIT_USER_DATABASE_COMPLETE",
  "REQUEST_UNDO_DIALOG_VISIBILITY"
].forEach(action => constants[action] = action);

module.exports = constants;
