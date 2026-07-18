'use strict'

const MINE = '💣'

var gBoard

var gTimerInterval

var gHistory = []

var gLevel = {
    SIZE: 4,
    MINES: 2
}

var gGame = {
    isOn: true,
    revealedCount: 0,
    markedCount: 0,
    secsPassed: 0,
    isFirstClick: true,
    lives: 3,
    hints: 3,
    isHintMode: false,
    safeClicks: 3,
    megaHint: 1,
    isMegaHintMode: false,
    megaHintStart: null,
    mineCount: gLevel.MINES
}

function onInit() {
    resetGame()
}

function buildBoard() {

    const board = []

    for (var i = 0; i < gLevel.SIZE; i++) {

        board[i] = []

        for (var j = 0; j < gLevel.SIZE; j++) {

            board[i][j] = {

                minesAroundCount: 0,

                isRevealed: false,

                isMine: false,

                isMarked: false
            }
        }
    }

    return board
}

function renderBoard(board) {

    var strHTML = ''

    for (var i = 0; i < board.length; i++) {

        strHTML += '<tr>'

        for (var j = 0; j < board[0].length; j++) {

            var cell = board[i][j]

            var value = getCellValue(cell)

            strHTML += `
    <td
    class="cell"
    data-i="${i}"
    data-j="${j}"
    onclick="onCellClicked(this, ${i}, ${j})"
    oncontextmenu="onCellMarked(event, ${i}, ${j})">
        ${value}
    </td>
`
        }

        strHTML += '</tr>'
    }

    document.querySelector('.board').innerHTML = strHTML
}

function onCellClicked(elCell, i, j) {

    if (!gGame.isOn) return

    const cell = gBoard[i][j]

    if (gGame.isMegaHintMode) {

        handleMegaHint(i, j)

        return
    }

    if (gGame.isHintMode) {

        showHint(i, j)

        return
    }

    if (gGame.isFirstClick) {

        placeMines(i, j)

        gGame.isFirstClick = false

        startTimer()
    }


    if (cell.isRevealed || cell.isMarked) return

    if (cell.isMine) {

        gGame.lives--

        updateLives()

        revealCell(cell, i, j)

        if (gGame.lives === 0) {

            revealAllMines()

            gGame.isOn = false

            stopTimer()

            document.querySelector('.smiley').innerText = '🤯'

            alert('Game Over')

            return
        }

        setTimeout(function () {

            cell.isRevealed = false

            gGame.revealedCount--

            const elCell = getCellElement({ i, j })

            elCell.classList.remove('revealed')

            renderCell({ i, j }, getCellValue(cell))

        }, 1000)

        return
    }

    const currentMove = []

    revealCell(cell, i, j, currentMove)

    if (cell.minesAroundCount === 0) {
        expandReveal(gBoard, i, j, currentMove)
    }

    gHistory.push(currentMove)

    checkGameOver()
}

function getRandomEmptyCell(excludeI, excludeJ) {

    while (true) {

        const i = getRandomIntInclusive(0, gLevel.SIZE - 1)
        const j = getRandomIntInclusive(0, gLevel.SIZE - 1)

        const cell = gBoard[i][j]

        if (cell.isMine) continue

        if (i === excludeI && j === excludeJ) continue

        return { i, j }
    }
}

function revealCell(cell, i, j, currentMove) {

    if (cell.isRevealed) return

    cell.isRevealed = true
    gGame.revealedCount++

    if (currentMove) {
        currentMove.push({ i, j })
    }

    const elCell = getCellElement({ i, j })
    elCell.classList.add('revealed')

    renderCell(
        { i, j },
        getCellValue(cell)
    )
}

function expandReveal(board, rowIdx, colIdx, currentMove) {

    forEachNeighbor(board, rowIdx, colIdx, function (cell, i, j) {

        if (cell.isMine) return
        if (cell.isRevealed) return
        if (cell.isMarked) return

        revealCell(cell, i, j, currentMove)

        if (cell.minesAroundCount === 0) {
            expandReveal(board, i, j, currentMove)
        }
    })
}

function placeMines(firstI, firstJ) {

    for (var i = 0; i < gLevel.MINES; i++) {

        const pos = getRandomEmptyCell(firstI, firstJ)

        gBoard[pos.i][pos.j].isMine = true
    }

    setMinesNegsCount(gBoard)
}

function setMinesNegsCount(board) {

    for (var i = 0; i < board.length; i++) {

        for (var j = 0; j < board[0].length; j++) {

            board[i][j].minesAroundCount = countNeighbors(board, i, j)

        }
    }
}

function countNeighbors(board, rowIdx, colIdx) {

    var count = 0

    forEachNeighbor(board, rowIdx, colIdx, function (cell) {

        if (cell.isMine) count++

    })

    return count
}

function getCellValue(cell) {

    if (cell.isMarked) return '🚩'

    if (!cell.isRevealed) return ''

    if (cell.isMine) return MINE

    if (cell.minesAroundCount > 0) {
        return cell.minesAroundCount
    }

    return ''
}

function revealAllMines() {

    for (var i = 0; i < gBoard.length; i++) {

        for (var j = 0; j < gBoard[0].length; j++) {

            const cell = gBoard[i][j]

            if (!cell.isMine) continue

            cell.isRevealed = true

            const elCell = getCellElement({ i, j })
            elCell.classList.add('revealed')

            renderCell(
                { i, j },
                getCellValue(cell)
            )
        }
    }
}

function updateMinesLeft() {

    const el = document.querySelector('.mines-left')

    el.innerText = gGame.mineCount - gGame.markedCount
}

function setLevel(size, mines) {

    gLevel.SIZE = size

    gLevel.MINES = mines

    onInit()
}

function getCellElement(location) {

    return document.querySelector(
        `[data-i="${location.i}"][data-j="${location.j}"]`
    )
}

function renderCell(location, value) {

    const elCell = getCellElement(location)

    elCell.innerHTML = value
}

function onCellMarked(ev, i, j) {

    ev.preventDefault()

    if (!gGame.isOn) return

    const cell = gBoard[i][j]

    if (cell.isRevealed) return

    cell.isMarked = !cell.isMarked

    if (cell.isMarked) {
        gGame.markedCount++
    } else {
        gGame.markedCount--
    }

    updateMinesLeft()

    updateFlags()

    renderCell({ i, j }, getCellValue(cell))

    checkGameOver()
}

function checkGameOver() {

    for (var i = 0; i < gBoard.length; i++) {

        for (var j = 0; j < gBoard[0].length; j++) {

            const cell = gBoard[i][j]

            if (cell.isMine && !cell.isMarked) return

            if (!cell.isMine && !cell.isRevealed) return
        }
    }

    gGame.isOn = false

    stopTimer()

    checkBestScore()

    document.querySelector('.smiley').innerText = '😎'

    alert('You Win! 🎉')
}

function resetGame() {

    stopTimer()

    document.querySelector('.smiley').innerText = '😃'

    gGame = {
        isOn: true,
        revealedCount: 0,
        markedCount: 0,
        secsPassed: 0,
        isFirstClick: true,
        lives: 3,
        hints: 3,
        isHintMode: false,
        megaHint: 1,
        isMegaHintMode: false,
        megaHintStart: null,
        safeClicks: 3,
        mineCount: gLevel.MINES
    }

    gBoard = buildBoard()

    renderBoard(gBoard)

    updateFlags()

    renderBestScore()

    updateMinesLeft()

    updateHints()

    updateLives()

    gHistory = []

    document.querySelector('.timer').innerText = 0

    document.querySelector('.safe-count').innerText = gGame.safeClicks

    document.querySelector('.exterminator').disabled = false
}
function startTimer() {

    gTimerInterval = setInterval(function () {

        gGame.secsPassed++

        document.querySelector('.timer').innerText = gGame.secsPassed

    }, 1000)
}

function stopTimer() {

    clearInterval(gTimerInterval)

    gTimerInterval = null
}

function updateFlags() {
    document.querySelector('.flags').innerText = gGame.markedCount
}

function updateLives() {
    document.querySelector('.lives').innerText = gGame.lives
}

function onHint() {

    if (!gGame.isOn) return
    if (gGame.isFirstClick) return
    if (gGame.hints === 0) return
    if (gGame.isHintMode) return

    gGame.isHintMode = true

    const elHint = document.querySelector('.hint')

    var str = ''

    for (var i = 0; i < 3; i++) {

        if (i === gGame.hints - 1) {
            str += '🔆'
        } else if (i < gGame.hints) {
            str += '💡'
        } else {
            str += '⚫'
        }
    }

    elHint.innerText = str
    elHint.classList.add('active')
}

function showHint(rowIdx, colIdx) {

    gGame.isHintMode = false

    gGame.hints--

    updateHints()

    document.querySelector('.hint').classList.remove('active')

    showCellTemporarily(rowIdx, colIdx)

    forEachNeighbor(gBoard, rowIdx, colIdx, function (cell, i, j) {

        showCellTemporarily(i, j)
    })
}

function showCellTemporarily(i, j) {

    const cell = gBoard[i][j]

    if (cell.isRevealed) return

    const elCell = getCellElement({ i, j })

    var value = ''

    if (cell.isMine) {
        value = MINE
    } else if (cell.minesAroundCount > 0) {
        value = cell.minesAroundCount
    }

    elCell.innerHTML = value
    elCell.classList.add('revealed')

    setTimeout(function () {

        elCell.classList.remove('revealed')

        renderCell(
            { i, j },
            getCellValue(cell)
        )

    }, 1000)
}

function updateHints() {

    const elHint = document.querySelector('.hint')

    var str = ''

    for (var i = 0; i < 3; i++) {

        if (i < gGame.hints) {
            str += '💡'
        } else {
            str += '⚫'
        }
    }

    elHint.innerText = str
}

function onSafeClick() {

    if (!gGame.isOn) return
    if (gGame.isFirstClick) return
    if (gGame.safeClicks === 0) return

    const safeCells = []

    for (var i = 0; i < gBoard.length; i++) {

        for (var j = 0; j < gBoard[0].length; j++) {

            const cell = gBoard[i][j]

            if (cell.isMine) continue
            if (cell.isRevealed) continue
            if (cell.isMarked) continue

            safeCells.push({ i, j })
        }
    }

    if (safeCells.length === 0) return

    const randomIdx = getRandomIntInclusive(0, safeCells.length - 1)
    const location = safeCells[randomIdx]

    showSafeCell(location)

    gGame.safeClicks--

    document.querySelector('.safe-count').innerText = gGame.safeClicks
}

function showSafeCell(location) {

    const elCell = getCellElement(location)

    elCell.classList.add('safe')

    setTimeout(function () {

        elCell.classList.remove('safe')

    }, 3000)
}

function getBestScoreKey() {
    return 'bestScore-' + gLevel.SIZE
}

function renderBestScore() {

    const key = getBestScoreKey()

    const bestScore = localStorage.getItem(key)

    const elBestScore = document.querySelector('.best-score')

    if (bestScore) {
        elBestScore.innerText = bestScore
    } else {
        elBestScore.innerText = '--'
    }
}

function checkBestScore() {

    const key = getBestScoreKey()

    const bestScore = localStorage.getItem(key)

    if (!bestScore || gGame.secsPassed < +bestScore) {

        localStorage.setItem(key, gGame.secsPassed)

        renderBestScore()
    }
}

function onToggleDarkMode() {

    document.body.classList.toggle('dark-mode')

    const elBtn = document.querySelector('.dark-mode-btn')

    if (document.body.classList.contains('dark-mode')) {
        elBtn.innerText = '☀️'
    } else {
        elBtn.innerText = '🌙'
    }
}

function onUndo() {

    if (gHistory.length === 0) return

    const lastMove = gHistory.pop()

    for (var i = 0; i < lastMove.length; i++) {

        const location = lastMove[i]
        const cell = gBoard[location.i][location.j]

        cell.isRevealed = false
        gGame.revealedCount--

        const elCell = getCellElement(location)

        elCell.classList.remove('revealed')

        renderCell(location, getCellValue(cell))
    }
}

function onMegaHint() {

    if (!gGame.isOn) return
    if (gGame.isFirstClick) return
    if (gGame.megaHint === 0) return

    gGame.isMegaHintMode = true
    gGame.megaHintStart = null

    document.querySelector('.mega-hint').classList.add('active')
}

function handleMegaHint(i, j) {

    if (!gGame.megaHintStart) {

        gGame.megaHintStart = { i, j }

        return
    }

    const start = gGame.megaHintStart
    const end = { i, j }

    showMegaHint(start, end)

    gGame.megaHint--

    gGame.isMegaHintMode = false
    gGame.megaHintStart = null

    document.querySelector('.mega-hint').classList.remove('active')
}

function showMegaHint(start, end) {

    const startRow = Math.min(start.i, end.i)
    const endRow = Math.max(start.i, end.i)

    const startCol = Math.min(start.j, end.j)
    const endCol = Math.max(start.j, end.j)

    for (var i = startRow; i <= endRow; i++) {

        for (var j = startCol; j <= endCol; j++) {

            showCellTemporarily(i, j)
        }
    }
}

function onMineExterminator() {

    if (!gGame.isOn) return
    if (gGame.isFirstClick) return

    const mines = []

    for (var i = 0; i < gBoard.length; i++) {

        for (var j = 0; j < gBoard[0].length; j++) {

            if (gBoard[i][j].isMine) {
                mines.push({ i, j })
            }
        }
    }

    const minesToRemove = Math.min(3, mines.length - 1)

    for (var i = 0; i < minesToRemove; i++) {

        const randomIdx = getRandomIntInclusive(0, mines.length - 1)

        const location = mines[randomIdx]

        gBoard[location.i][location.j].isMine = false

        mines.splice(randomIdx, 1)
    }

    gGame.mineCount -= minesToRemove

    setMinesNegsCount(gBoard)

    updateMinesLeft()

    document.querySelector('.exterminator').disabled = true
}