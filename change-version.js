const fs = require("fs")

var fileName = "./package.json"
var buffer = fs.readFileSync(fileName)
try {
  var json = JSON.parse(buffer.toString())

  var birthday = json.birthday
  if (!birthday) {
    return console.error(
      'Нужно указать дату рождения модуля в формате yyyy-mm-dd. Затем перезпустить vs. Например, birthday: "2019-04-22"'
    )
  }
  var version = json.version.split(".")

  if (version.length >= 1) {
    version = version.slice(0, 1)
  }
  var newVersion =
    version[0] +
    "." +
    Math.floor(
      Math.abs(new Date().getTime() - new Date(birthday).getTime()) /
        (1000 * 3600 * 24)
    ) +
    "." +
    (new Date().getHours() * 60 + new Date().getMinutes())

  var result = buffer
    .toString()
    .replace(
      /\"version\"\s*:\s*\"[\d\.]*\",/,
      '"version": "' + newVersion + '",'
    )
  fs.writeFileSync(fileName, result)
} catch (exc) {
  console.error("Ошибка распознования файл package.json. " + exc.stack)
}
