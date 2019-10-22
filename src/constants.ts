export const LABELS = {
  IMPACT_MAJOR: {
    name: 'Impact: Major',
    description: 'When you make incompatible API changes',
    color: '69D100',
  },

  IMPACT_MINOR: {
    name: 'Impact: Minor',
    description: 'When you add functionality in a backwards-compatible manner',
    color: '5CB85C',
  },
  IMPACT_PATCH: {
    name: 'Impact: Patch',
    description: 'When you make backwards-compatible bug fixes.',
    color: 'A8D695',
  },
  PM_DESIGN: {
    name: 'PM: Design',
    description: 'The feature is that are currently in design.',
    color: '386DBD',
  },
  PM_DESIGN_NEEDED: {
    name: 'PM: Design Needed',
    description: '',
    color: '5843AD',
  },
  PM_DOING: {
    name: 'PM: Doing',
    description: ' Currently under development',
    color: '009DDD',
  },
  PM_RELEASE: {
    name: 'PM: Ready for Release',
    description:
      'All merge requests which have been reviewed and are ready for release.',
    color: '5CB85C',
  },
  PM_REVIEW: {
    name: 'PM: Ready for Review',
    description: ' Ready for review',
    color: '05D3F8',
  },
  PM_TASKS: {
    name: 'PM: Tasks',
    description:
      'Tickets ready for development. Devs pull from this queue of tasks',
    color: '428BCA',
  },
  PRIORITY_CRITICAL: {
    name: 'Priority: Critical',
    description: 'Everyone needs to jump in and try to get the work done',
    color: 'FF0000',
  },
  PRIORITY_HIGH: {
    name: 'Priority: High',
    description:
      'It requires attention, the necessary work needs to be done as quickly as possible.',
    color: 'C70000',
  },
  PRIORITY_LOW: {
    name: 'Priority: Low',
    description: 'Need to be done someday in the quarter',
    color: '4F0000',
  },
  PRIORITY_MEDIUM: {
    name: 'Priority: medium',
    description:
      'It need to be done, in the current development cycle (sprint)',
    color: '8C0000',
  },
  TYPE_BUG: {
    name: 'Type: Bug',
    description:
      "Changes in the code to fix something that already exist, but isn't working properly",
    color: 'FF0000',
  },
  TYPE_ENHANCEMENT: {
    name: 'Type: Enhancement',
    description:
      'Changes in the code that improves that, e.g.: refactoring a function, fixing typos',
    color: 'F8CA00',
  },
  TYPE_EPIC: {
    name: 'Type: Epic',
    description:
      "GitLab doesn't allow Epics to be viewed on the board, so we use an issue with a Label!",
    color: '0033CC',
  },
  TYPE_FEATURE: {
    name: 'Type: Feature',
    description:
      'Changes in the code that adds new functionalities, e.g.: generate reports',
    color: '5CB85C',
  },
  TYPE_RD: {
    name: 'Type: R&D',
    description: 'Research and Development',
    color: '34495E',
  },
}
