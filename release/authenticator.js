const lists = [
  { app: 'ultimate-order-view', blckList: [] },
  { app: 'picklist-dashboard', blckList: [] },
  { app: 'find-bag-aftlite', blckList: [] },
  { app: 'find-bag-como', blckList: [] },
  { app: 'better-ob-dashboard-portal', blckList: [] },
  { app: 'better-ob-dashboard-na', blckList: [] },
]

function isValid(user, app) {
  const { blackList } = lists.find((list) => list.app === app)
  console.log('User: ', user)
  console.log('App: ', app)

  if (blackList.includes(user)) {
    return false
  }
  return true
}
