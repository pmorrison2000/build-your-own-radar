const ExceptionMessages = {
  TOO_MANY_RINGS: 'More than 4 rings.',
  MISSING_HEADERS: 'Document is missing one or more required headers or they are misspelled. ' +
  'Check that your document contains headers for Technology, Ring, Theme, Description, Status, Tags',
  MISSING_CONTENT: 'Document is missing content.',
  SHEET_NOT_FOUND: 'Oops! We can’t find the Google Sheet you’ve entered. Can you check the URL?',
  UNAUTHORIZED: 'UNAUTHORIZED'
}

module.exports = ExceptionMessages
