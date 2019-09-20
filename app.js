/**
 * конструктор игры Lines
 * @param {string} имя класса hyml-контейнера игры
 */
function Lines(gameBoxClass){
    // блок с игровым полем
    this.box = document.querySelector('.' + gameBoxClass);
    // класс блока
    this.boxClassName = gameBoxClass;
    // массив объектов-узлов игрового поля
    this.gameField = [];
    // создание и инициализация массива объектов-узлов игрового поля
    this.creatGameField( this.box.querySelectorAll('.row') );
    // запрет на выполнение действий (например, пока длится перемещение шарика)
    this.actionsBlocked = false;
    // текущий счет
    this.score = 0;
    // текущий рекорд
    this.currentHighScore = 0;
    // классы цветов шариков
    this.colorsClassNames = [ 'cell__ball_color-red',
                              'cell__ball_color-orange',
                              'cell__ball_color-yellow',
                              'cell__ball_color-green',
                              'cell__ball_color-blue',
                              'cell__ball_color-indigo',
                              'cell__ball_color-violet'];
    
    // метод перемещает шарик по кратчайшему маршруту
    this.moveOnShorteRoute = this.moveOnShorteRoute.bind(this);
    // обработчик событий "click"
    this.clickHandler = this.clickHandler.bind(this);

    this.box.addEventListener('click', this.clickHandler);
    // если браузер поддерживает локальную установку cookie 
    // в них можно хранить промежуточные достижения
    this.updateHighScore();  
    // запуск новой игры
    this.startNewGame();
}

/**
 * Создает двумерный массив объектов-узлов игрового поля
 * @param {HTMLCollection} rows коллекция строк с узлами игровой сетки
 */
Lines.prototype.creatGameField = function(rows){
    // формирование и помещение в массив объектов-ячеек
    for(var i = 0; i < rows.length; i++){
        this.gameField[i] = [];
        for(var j = 0; j < rows[i].children.length; j++){
            // будущий узел-ячейка игрового поля
            var gameNode = {};
            // количество узлов-ячеек игрового поля в текущей строке
            var totalNodes = rows[i].children.length;

            // html элемент, соответствующий клетке игрового поля
            gameNode.htmlNode = rows[i].children[j];
            // метка для алгоритма Дейкстры:
            // минимальное известное расстояние от заданной вершины до данной вершины
            gameNode.currentMinDistance = Infinity; 
            // узел обработан по алгоритму Дейкстра ("посещенная вершина")
            gameNode.nodeWasVisited = false;
            // индексы текущего узла
            gameNode.iIdx = i;
            gameNode.jIdx = j;

            // узел игрового поля
            this.gameField[i][j] = gameNode;

        }
    }
    
    // организация перекрестных ссылок между объектами массива
    // каждый узел имеет массив сслылок на смежные узлы (по горизонтали и вертикали)
    for(var i = 0; i < rows.length; i++){
        for(var j = 0; j < rows[i].children.length; j++){
            // добавление массива со ссылками на смежные элементы
            var nextNodesArr = [];
            nextNodesArr.push( ((j-1 < 0) ? null: this.gameField[i][j-1]) );
            nextNodesArr.push( ((j+1 >= totalNodes) ? null: this.gameField[i][j+1]) );
            nextNodesArr.push( ((i-1 < 0) ? null: this.gameField[i-1][j]) );
            nextNodesArr.push( ((i+1 >= totalNodes) ? null: this.gameField[i+1][j]) );

            // удаляем ссылок с null
            this.gameField[i][j].nextNodesArray = nextNodesArr.filter(function(node){ 
                if(node) return true; 
                return false;
            });
        }
    }
}
/**
 * "Перемещает" шарик из узла startNode в узел endNode
 * @param {Object} startNode стартовый узел (элемент массива this.gameField)
 * @param {Object} endNode конечный узел (элемент массива this.gameField)
 */
Lines.prototype.moveBall = function(startNode, endNode){
    // массив вершин кратчайшего пути от startNode до endNode
    var shortRoute = this.getShortestPath(startNode, endNode);
    if(!shortRoute) return;
    // класс с цветом "перемещаемого" шарика
    var colorClassName = this.getColorBallClass(startNode.htmlNode.querySelector('.cell__ball'));
    
    // задержка шарика в каждой клетке по пути следования
    var animationDuration = parseFloat(window.getComputedStyle(this.box).animationDuration);

    // перевод сек в мс
    animationDuration = 1000 * animationDuration;
    
    if(!this.actionsBlocked){
        this.moveOnShorteRoute(shortRoute, colorClassName, animationDuration);
    }
    
}
/**
 * Возвращает класс с цветом шарика
 * @param {HTMLElement} ball html элемент - шарик
 * @returns {string} класс с цветом шарика
 */
Lines.prototype.getColorBallClass = function(ball){
    for(var className of ball.classList){
        if(/^(cell__ball_color-)/.test(className)){
            return className;
        }
    }
    return '';
}

/**
 * Перемещает шарик по кратчайшему маршруту из массива вершин shortRoute 
 * @param {Array} shortRoute массив вершин кратчайшего маршрута
 * @param {string} colorClassName имя класса с цветом перемещаемого шарика
 * @param {integer} animationDuration длительность "пребывания" шарика в каждой клетке маршрута в мс
 */
Lines.prototype.moveOnShorteRoute = function(shortRoute, colorClassName, animationDuration){
    
    // блокируем действия, чувствительные к перемещению шарика 
    this.actionsBlocked = true;
    // ищем вершину маршрута где в настоящий момент "находится" шарик
    // и "перемещаем" его в следующую вершину
    for(var i = 0; i < shortRoute.length-1; i++){
        // текущий шарик
        var ball = shortRoute[i].htmlNode.querySelector('.cell__ball');
        // шарик в следующей клетке маршрута
        var nextBall = shortRoute[i+1].htmlNode.querySelector('.cell__ball');

        // если шарик видим, значит вершина найдена
        if(ball.classList.contains('cell__ball_visible')){

            if(i == 0){ // отключить прыгание у шарика в начале маршрута
                ball.classList.remove('cell__ball_jumps-animation');
            }
            ball.classList.remove('cell__ball_visible'); 
            ball.classList.remove(colorClassName);
            ball.classList.remove('cell__ball_move-animation');

            nextBall.classList.add(colorClassName);
            nextBall.classList.add('cell__ball_visible');
            // включение "анимации" у шарика в следующей клетке маршрута (исключая последнюю клетку)
            if( (i+1) != (shortRoute.length-1) ){
                nextBall.classList.add('cell__ball_move-animation');
            }
            // рекурсивно вызвать следующий шаг по перемещению шарика через animationDuration мс
            setTimeout(this.moveOnShorteRoute, animationDuration, shortRoute, colorClassName, animationDuration);
            // шаг по перемещению шарика завершен, следующий будет через animationDuration мс
            // с чувством выполненного долга завершаем выполнение функции
            return;
        }  
    }
    // шарик в последней точке маршрута
    var endBall = shortRoute[shortRoute.length-1].htmlNode.querySelector('.cell__ball');
    // если шарик в последней точке маршрута видим (display:block), значит перемещение закончилось
    if( endBall.classList.contains('cell__ball_visible') ){
        // выполнить удаление шариков, если они находятся в линии
        var currentScore = this.removeBallsInLines();
        // показать новые шарики, если удаления не было
        if(currentScore == 0){
            this.showNextBalls();
        }
        // обновить счет
        this.addGameScore(currentScore);
        // снять блокировку        
        this.actionsBlocked = false;
    }
}
/**
 * "Поместить" на игровое поле следующие 3 цветных шарика
 */
Lines.prototype.showNextBalls = function(){
    // шарики из панели предпросмотра будущих шариков
    var colorsBalls = this.box.querySelectorAll('.next-ball-box__ball');
    // массив классов с цветом каждого будущего шарика
    var colorClassNames = [];
    for(var ball of colorsBalls){
        colorClassNames.push(this.getColorBallClass(ball));
    }
    // цикл отображения новых шариков
    for(var i = 0; i < 3; i++){
        // случайные координаты
        var coords = this.getRandomCoords();
        // если поле переполнено
        if(!coords){ 
            // завершение игрового процесса
            this.gameOver();
            // старт новой игры
            this.startNewGame();
            return;
        }
        // шарик по случайным координатам
        var currentBall = this.gameField[coords.iIdx][coords.jIdx].htmlNode.querySelector('.cell__ball');
        // покрасить и показать шарик на игровом поле
        currentBall.classList.add(colorClassNames[i]);
        currentBall.classList.add('cell__ball_visible');
        // если образовалась линия - удаляем без пересчета очков
        this.removeBallsInLines();
    }
    // если поле переполнено
    if(this.isGameFieldBusy()){
        // завершение игры
        this.gameOver();
        // старт новой игры
        this.startNewGame();
        return;
    }
    // обновить панель предпросмотра будущих шариков
    this.showNextBallsColors();    

}
/**
 * Завершение игры 
 */
Lines.prototype.gameOver = function(){

    this.updateHighScore();
    this.showHighScore();

}
/**
 * Получить содержимое cookie с именем name
 * @param {string} name имя cookie
 */
Lines.prototype.getCookie = function(name) {
    let matches = document.cookie.match(new RegExp(
      "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}
/**
 * Показать текущие рекорды
 */
Lines.prototype.showHighScore = function(){
    var highScoreElement = this.box.querySelector('.highscore__value');
    highScoreElement.textContent = this.currentHighScore;
}
/**
 * Обнуляет рекорды
 */
Lines.prototype.resetHighScore = function(){

    this.currentHighScore = 0;
    document.cookie = 'score='+this.currentHighScore+';path=/;max-age=31536000;';

    this.showHighScore();
}

/**
 * Установить новые значения максимального количества набранных очков
 */
Lines.prototype.updateHighScore = function(){

// выбирает максимум из зарписей рекордов в cookie,
// набранных очков в данной игре (this.score),  
// текущех рекордов данного сеанса (this.currentHighScore)
// этот максимум устанавливает в this.currentHighScore
// записывает this.currentHighScore в cookie

    var cookieHighScoreValue = this.getCookie('score');
    var intCookieValue = 0;

    if(cookieHighScoreValue === undefined || cookieHighScoreValue == ''){
        this.currentHighScore = Math.max(this.currentHighScore, this.score);
    } else {
        intCookieValue = parseFloat(cookieHighScoreValue);
        this.currentHighScore = Math.max(intCookieValue, this.score, this.currentHighScore);
    }

    if(this.currentHighScore > intCookieValue){
        document.cookie = 'score='+this.currentHighScore+';path=/;max-age=31536000;';
    }

}
/**
 * Показывает набор цветных шариков для следущего хода
 */
Lines.prototype.showNextBallsColors = function(){
    // шарики из панели для демонстрации следующих цветов
    var colorsBalls = this.box.querySelectorAll('.next-ball-box__ball');
    var self = this;
    [].slice.call(colorsBalls).forEach(ball => {
        var currentColorClassName = self.getColorBallClass(ball);
        if(currentColorClassName) ball.classList.remove(currentColorClassName);
        ball.classList.add(self.getRandomColorClassName());
    });
}
/**
 * Возвращает случайно выбранное 
 * имя класса с цветом шарика
 * @returns {string} имя класса с цветом шарика
 */
Lines.prototype.getRandomColorClassName = function(){
    var min = 0, max = 6;
    return this.colorsClassNames[Math.floor(Math.random() * (max - min + 1)) + min];
}
/**
 * Проверяет наличие шарика по координатам в игровом поле
 * @param {integer} i первый индекс в массиве узлов игрового поля
 * @param {integer} j второй индекс в массиве узлов игрового поля
 */
Lines.prototype.checkBallCoordinates = function(i,j){
    return this.isNodeBusy(this.gameField[i][j]);
}
/**
 * Проверяет заполненность всех ячеек игрового поля
 * Возвращает true, если все ячейки игрового поля заняты шариками
 * @returns {boolean} true - если все узлы игрового поля заняты шариками
 */
Lines.prototype.isGameFieldBusy = function(){
    for(var row of this.gameField){
        for(var node of row){
            if(!this.isNodeBusy(node)) return false;
        }
    }
    return true;
}
/**
 * Возвращает случайные координаты свободной клетки 
 * для нового шарика (координаты - это индексы в массиве this.gameField)
 * Если игровое поле занято, то возвращает null
 * @returns {Object} объект с координатами свободной клетки {iIdx: индекс_i, jIdx: индекс_j} или null
 */
Lines.prototype.getRandomCoords = function(){

    if (this.isGameFieldBusy()) return null;

    var max = 8, min = 0;
    var i = 0, j = 0;
    do{
        i = Math.floor(Math.random() * (max - min + 1)) + min;
        j = Math.floor(Math.random() * (max - min + 1)) + min;
    } while(this.checkBallCoordinates(i,j));

    return {iIdx: i, jIdx: j};
}
/**
 * Проверяет наличие шарика в ячейке игрового поля
 * @param {Object} node объект-узел игрового поля
 * @returns {boolean} true - если игровое поле занято шариком
 */
Lines.prototype.isNodeBusy = function(node){
    return node.htmlNode.querySelector('.cell__ball').classList.contains('cell__ball_visible');
}
/**
 * Инициализация новой игры
 */
Lines.prototype.startNewGame = function(){
    this.resetNodesState(); // для алгоритма Дейкстры
    this.updateHighScore(); // обновить рекорды
    this.resetGameScore(); // обнулить счет
    this.showHighScore(); // показать рекорды
    this.cleareGameField(); // очистить игровое поле
    this.showNextBallsColors(); // показать следующий набор цветов
    this.showNextBalls(); // показать следующие 3 шарика на игровом поле
}
/**
 * Очистить игровое поле от шариков
 */
Lines.prototype.cleareGameField = function(){
    for(var row of this.gameField){
        for(var node of row){
            var ball = node.htmlNode.querySelector('.cell__ball');
            ball.className = '';
            ball.classList.add('cell__ball');
        }
    }
}

/**
 * Расстановка меток кратчайших расстояний от начальной вершины до каждой вершины
 * @param {Object} startNode исходный узел
 * @param {Object} endNode конечный узел
 * @returns {Object} endNode, если вершина достижима или null в противном случае
 */
Lines.prototype.markNodesByMinDistanceLabels = function(startNode, endNode){
    // сброс состояния всех узлов
    this.resetNodesState();
    // установка минимальной дистанции для стартового узла
    startNode.currentMinDistance = 0;
    // текущая вершина, для которой определяется расстояние до начальной вершины
    var currentNearestNode = startNode;

    while(true){
        // если такого узела не существует, (все вершины посещались или блокированы шариками)
        // или достигнута конечная точка
        if(currentNearestNode === null || currentNearestNode==endNode){
            return currentNearestNode;
        }

        // проверяем, связанные с текущей, вершины
        for(var node of currentNearestNode.nextNodesArray){
            if( (node.currentMinDistance!=0) && 
                (!node.nodeWasVisited) &&
                !this.isNodeBusy(node)
            ){
                // устанавливаем вес дуги от текущей вершины до следующей
                var arcWeight = 1;
                // расчетная минимальная дистанция для данного узла
                var currentMinDistance = currentNearestNode.currentMinDistance + arcWeight;
                if( node.currentMinDistance > currentMinDistance ){
                    node.currentMinDistance = currentMinDistance;
                }
            }
        }
        // установка для текущего узла статуса "посещенный узел"
        currentNearestNode.nodeWasVisited = true;
        
        //Выбираем следующую вершину с минимальной дистанцией до начальной точки
        currentNearestNode = this.getCurrentMinDistanceNode(currentNearestNode);
    }
}

/**
 * Сброс свойств узлов:
 * currentMinDistance = Infinity; текущая минимальная дистанция
 * nodeWasVisited = false; отметка о посещении узла 
 */
Lines.prototype.resetNodesState = function(){

    for(var row of this.gameField){
        for(var node of row){
            node.currentMinDistance = Infinity;
            node.nodeWasVisited = false;
        }
    }
}

/**
 * Возвращает узел с минимальной дистанцией до начальной точки 
 * @returns {Object} узел с минимальным currentMinDistance
 */
Lines.prototype.getCurrentMinDistanceNode = function(){
    // текущее минимальная дистанция для проверяемого узла
    var currentMinDistance = Infinity;
    // текущий проверяемый узел
    var currentNearestNode = null;
    
    for(var row of this.gameField){
        for(var node of row){
            if( node.currentMinDistance < currentMinDistance && 
                node.currentMinDistance!=0 &&
                !node.nodeWasVisited &&
                !this.isNodeBusy(node)
            ){
                currentMinDistance = node.currentMinDistance;
                currentNearestNode = node;            
            }     
        }
    }

    return currentNearestNode;
}
/**
 * Получить кратчайший маршрут между двумя узлами
 * @param {Object} startNode начальный узел (элемент массива this.gameField)
 * @param {Object} endNode конечный узел (элемент массива this.gameField)
 * @returns {Array} массив вершин кратчайшего пути
 */
Lines.prototype.getShortestPath = function(startNode, endNode){
    // массив вершин кратчайшего пути
    var shortesPath = [];
    // если endNode недостижим из startNode
    if(!this.markNodesByMinDistanceLabels(startNode, endNode)) 
        return null;
    // следуем из конечной вершины в начальную по меткам минимальных дистанций
    while(endNode!=startNode){
        shortesPath.push(endNode);

        var currentMinDistance = Infinity;
        // перебираем смежные с конечной вершиной клетки
        // и выбираем клетку с минимальной дистанцией до начальной вершины
        for(node of endNode.nextNodesArray){
            if(node.currentMinDistance < currentMinDistance){
                var currentNextNode = node;
                currentMinDistance = node.currentMinDistance;
            }
        }
        endNode = currentNextNode;
    }
    // добавляем стартовую вершину
    shortesPath.push(startNode);
    shortesPath.reverse();
    
    return shortesPath;
}
/**
 * Отключаем "прыгание" у всех шариков
 */
Lines.prototype.removeJumpsClass = function(){
    for( var row of this.box.querySelectorAll('.row') ){
        for(var cell of row.querySelectorAll('.cell')){
            cell.querySelector('.cell__ball').classList.remove('cell__ball_jumps-animation');
        }
    } 
}

/**
 * Получить объект-узел игрового поля из массива this.gameField
 * соответствующий html-ячейке игрового поля
 * @param {HTMLElement} cell ячейка игрового поля
 */
Lines.prototype.getGameFieldNode = function(cell){
    for(var i = 0; i < this.gameField.length; i++){
        for(var j = 0; j < this.gameField[i].length; j++){
            if(this.gameField[i][j].htmlNode == cell) return this.gameField[i][j];
        }
    }
    return null;
}
/**
 * Обнуление счета
 */
Lines.prototype.resetGameScore = function(){
    this.score = 0;
    this.box.querySelector('.score__value').innerText = this.score;
}
/**
 * Увеличение счета
 * @param {integer} count добавляемые очки
 */
Lines.prototype.addGameScore = function(count){
    this.score += count;
    this.box.querySelector('.score__value').innerText = this.score;
}

/**
 * Проверяет принадлежит ли шарик в данной ячейке какой-нибудь линии
 * @param {Object} node объект-узел игрового поля
 * @returns {boolean} true - если принадлежит
 */
Lines.prototype.checkBallsInLine = function(node){
    return  this.checkHorizontalBallsLine(node)     ||
            this.checkVerticalBallsLine(node)       ||
            this.checkLeftDiagonalBallsLine(node)   ||
            this.checkRightDiagonalBallsLine(node);

}
/**
 * Проверяет шарик на принадлежность к горизонтальной линии одноцветных шариков
 * @param {Object} node объект-узел игрового поля
 * @returns {boolean} true - если принадлежит линии одноцветных шариков
 */
Lines.prototype.checkHorizontalBallsLine = function(node){
    // класс с цветом проверяемого шарика
    var colorClassName = this.getColorBallClass(node.htmlNode.querySelector('.cell__ball'));
    if(colorClassName == '') return false;

    // счетчик шариков с таким же цветом образующих линию с целевым шариком
    var cntSameColorBall = 0;
    // индикаторы пустого поля слева и справа по ходу движения
    var nextLeftBlocked = false;
    var nextRightBlocked = false;

    for(var i = 1; i < 5; i++){
        // условия: по ходу движения влево от шарика не было пустых клеток
        // граница игрового поля слева не достигнута
        // шарик в проверяемой ячейке видим
        // шарик того же цвета, что и исходный шарик
        if( !nextLeftBlocked &&
            (node.jIdx - i) >= 0 &&
            this.gameField[node.iIdx][node.jIdx-i].htmlNode.querySelector('.cell__ball').classList.contains('cell__ball_visible') &&
            this.gameField[node.iIdx][node.jIdx-i].htmlNode.querySelector('.cell__ball').classList.contains(colorClassName)    
        ){
            cntSameColorBall++;
        } else { 
            nextLeftBlocked = true; 
        }
        
        // условия: по ходу движения вправо от шарика не было пустых клеток
        // граница игрового поля справа не достигнута
        // шарик в проверяемой ячейке видим
        // шарик того же цвета, что и исходный шарик
        if( !nextRightBlocked &&
            (node.jIdx + i) < this.gameField[node.iIdx].length &&
            this.gameField[node.iIdx][node.jIdx+i].htmlNode.querySelector('.cell__ball').classList.contains('cell__ball_visible') &&
            this.gameField[node.iIdx][node.jIdx+i].htmlNode.querySelector('.cell__ball').classList.contains(colorClassName)
        ){
            cntSameColorBall++;
        } else { 
            nextRightBlocked = true; 
        }

    }
    return cntSameColorBall >= 4;
}
/**
 * Проверяет шарик на принадлежность к вертикальной линии одноцветных шариков
 * @param {Object} node объект-узел игрового поля
 * @returns {boolean} true - если принадлежит линии одноцветных шариков
 */
Lines.prototype.checkVerticalBallsLine = function(node){
    var colorClassName = this.getColorBallClass(node.htmlNode.querySelector('.cell__ball'));
    if(colorClassName == '') return false;

    // счетчик шариков с таким же цветом образующих линию с целевым шариком
    var cntSameColorBall = 0;
    // индикаторы пустого поля сверху и снизу по ходу движения
    var nextTopBlocked = false;
    var nextBottomBlocked = false;

    for(var i = 1; i < 5; i++){
        // условия: по ходу движения вверх от шарика не было пустых полей
        // граница игрового поля сверху не достигнута
        // шарик в проверяемой ячейке видим
        // шарик того же цвета, что и исходный шарик
        if( !nextTopBlocked &&
            (node.iIdx - i) >= 0 &&
            this.gameField[node.iIdx-i][node.jIdx].htmlNode.querySelector('.cell__ball').classList.contains('cell__ball_visible') &&
            this.gameField[node.iIdx-i][node.jIdx].htmlNode.querySelector('.cell__ball').classList.contains(colorClassName)    
        ){
            cntSameColorBall++;
        } else { 
            nextTopBlocked = true; 
        }
        
        // условия: по ходу движения вниз от шарика не было пустых полей
        // граница игрового поля снизу не достигнута
        // шарик в проверяемой ячейке видим
        // шарик того же цвета, что и исходный шарик
        if( !nextBottomBlocked &&
            (node.iIdx + i) < this.gameField.length &&
            this.gameField[node.iIdx+i][node.jIdx].htmlNode.querySelector('.cell__ball').classList.contains('cell__ball_visible') &&
            this.gameField[node.iIdx+i][node.jIdx].htmlNode.querySelector('.cell__ball').classList.contains(colorClassName)
        ){
            cntSameColorBall++;
        } else { 
            nextBottomBlocked = true; 
        }

    }
    return cntSameColorBall >= 4;
}
/**
 * Проверяет шарик на принадлежность к левой диагональной (\) линии одноцветных шариков
 * @param {Object} node объект-узел игрового поля
 * @returns {boolean} true - если принадлежит линии одноцветных шариков
 */
Lines.prototype.checkLeftDiagonalBallsLine = function(node){
    var colorClassName = this.getColorBallClass(node.htmlNode.querySelector('.cell__ball'));
    if(colorClassName == '') return false;

    // счетчик шариков с таким же цветом образующих линию с целевым шариком
    var cntSameColorBall = 0;
    // индикаторы пустого поля сверху и снизу по ходу движения
    var nextTopBlocked = false;
    var nextBottomBlocked = false;

    for(var i = 1; i < 5; i++){
        // условия: по ходу движения вверх и влево от шарика не было пустых полей
        // граница игрового поля сверху и слева не достигнута
        // шарик в проверяемой ячейке видим
        // шарик того же цвета, что и исходный шарик
        if( !nextTopBlocked &&
            (node.iIdx - i) >= 0 && (node.jIdx - i) >= 0 &&
            this.gameField[node.iIdx-i][node.jIdx-i].htmlNode.querySelector('.cell__ball').classList.contains('cell__ball_visible') &&
            this.gameField[node.iIdx-i][node.jIdx-i].htmlNode.querySelector('.cell__ball').classList.contains(colorClassName)    
        ){
            cntSameColorBall++;
        } else { 
            nextTopBlocked = true; 
        }
        
        // условия: по ходу движения вниз и вправо от шарика не было пустых полей
        // граница игрового поля снизу и справа не достигнута
        // шарик в проверяемой ячейке видим
        // шарик того же цвета, что и исходный шарик
        if( !nextBottomBlocked &&
            (node.iIdx + i) < this.gameField.length && (node.jIdx + i) < this.gameField[node.iIdx].length &&
            this.gameField[node.iIdx+i][node.jIdx+i].htmlNode.querySelector('.cell__ball').classList.contains('cell__ball_visible') &&
            this.gameField[node.iIdx+i][node.jIdx+i].htmlNode.querySelector('.cell__ball').classList.contains(colorClassName)
        ){
            cntSameColorBall++;
        } else { 
            nextBottomBlocked = true; 
        }

    }
    return cntSameColorBall >= 4;

}

/**
 * Проверяет шарик на принадлежность к правой диагональной (/) линии одноцветных шариков
 * @param {Object} node объект-узел игрового поля
 * @returns {boolean} true - если принадлежит линии одноцветных шариков
 */
Lines.prototype.checkRightDiagonalBallsLine = function(node){
    var colorClassName = this.getColorBallClass(node.htmlNode.querySelector('.cell__ball'));
    if(colorClassName == '') return false;

    // счетчик шариков с таким же цветом образующих линию с целевым шариком
    var cntSameColorBall = 0;
    // индикаторы пустого поля сверху и снизу по ходу движения
    var nextTopBlocked = false;
    var nextBottomBlocked = false;

    for(var i = 1; i < 5; i++){
        // условия: по ходу движения вверх и вправо от шарика не было пустых полей
        // граница игрового поля сверху и справа не достигнута
        // шарик в проверяемой ячейке видим
        // шарик того же цвета, что и исходный шарик
        if( !nextTopBlocked &&
            (node.iIdx - i) >= 0 && (node.jIdx + i) < this.gameField[node.iIdx].length && // сверху и справа
            this.gameField[node.iIdx-i][node.jIdx+i].htmlNode.querySelector('.cell__ball').classList.contains('cell__ball_visible') &&
            this.gameField[node.iIdx-i][node.jIdx+i].htmlNode.querySelector('.cell__ball').classList.contains(colorClassName)    
        ){
            cntSameColorBall++;
        } else { 
            nextTopBlocked = true; 
        }
        
        // условия: по ходу движения вниз и влево от шарика не было пустых полей
        // граница игрового поля снизу и слева не достигнута
        // шарик в проверяемой ячейке видим
        // шарик того же цвета, что и исходный шарик
        if( !nextBottomBlocked &&
            (node.iIdx + i) < this.gameField.length && (node.jIdx - i) >= 0 &&
            this.gameField[node.iIdx+i][node.jIdx-i].htmlNode.querySelector('.cell__ball').classList.contains('cell__ball_visible') &&
            this.gameField[node.iIdx+i][node.jIdx-i].htmlNode.querySelector('.cell__ball').classList.contains(colorClassName)
        ){
            cntSameColorBall++;
        } else { 
            nextBottomBlocked = true; 
        }

    }
    return cntSameColorBall >= 4;

}

/**
 * "Удаляет" шарики построенные в линию
 * возвращает количество очков
 * @returns {integer} количество очков
 */
Lines.prototype.removeBallsInLines = function(){
    // завести массив помеченных шариков
    var removedBalls = [];
    // поместить туда узлы игрового поля 
    // в которых находятся удаляемые шарики 
    for(var row of this.gameField){
        for(var node of row){
            if(this.checkBallsInLine(node)){
                removedBalls.push(node);
            }
        }
    }
    for(node of removedBalls){
        var ball = node.htmlNode.querySelector('.cell__ball');
        ball.classList.remove('cell__ball_visible');
        var colorClassName = this.getColorBallClass(ball);
        ball.classList.remove(colorClassName);
    }

    return removedBalls.length ? (5+(removedBalls.length-5)*3): 0;

}

/**
 * Обработчик события "click"
 * @param {EventObject} e объект события
 */
Lines.prototype.clickHandler = function(e){
    
    var target = e.target;

    while(  !target.classList.contains('cell') && 
            !target.classList.contains(this.boxClassName) &&
            !target.classList.contains('new-game-button') &&
            !target.classList.contains('reset-highscore-button')
    ){ 
        target = target.parentNode; 
    }

    if(target.classList.contains('cell')){

        // прыгающий шарик (если есть такой)
        var jumpingBall = this.box.querySelector('.cell__ball_jumps-animation');
        // если есть прыгающий шарик и он видим
        if( jumpingBall && window.getComputedStyle(jumpingBall).display != 'none' ){
            // если кликнули по пустому полю при прыгающем шарике
            if( window.getComputedStyle(target.querySelector('.cell__ball')).display == 'none'  ){
                var endNode = this.getGameFieldNode(target);
                var startNode = this.getGameFieldNode(jumpingBall.parentNode);
                
                this.moveBall(startNode, endNode);
            }
        }

        this.removeJumpsClass();
        // если перемещение закончилось и выполнен click по не прыгающему шарику
        if(!this.actionsBlocked && target.querySelector('.cell__ball') != jumpingBall){
            target.querySelector('.cell__ball').classList.add('cell__ball_jumps-animation');
        }
            
    }
    if(target.classList.contains('new-game-button')){
        this.gameOver();
        this.startNewGame();
    }
    if(target.classList.contains('reset-highscore-button')){
        this.resetHighScore();
    }
}