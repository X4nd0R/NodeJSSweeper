/*Copyright (C) 2019  Xandor(Martin Caum)
 *
 *This program is free software: you can redistribute it and/or modify
 *it under the terms of the GNU General Public License as published by
 *the Free Software Foundation, either version 3 of the License, or
 *(at your option) any later version.
 *
 *This program is distributed in the hope that it will be useful,
 *but WITHOUT ANY WARRANTY; without even the implied warranty of
 *MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *GNU General Public License for more details.
 *
 *You should have received a copy of the GNU General Public License
 *along with this program.  If not, see <http://www.gnu.org/licenses/>
 */

var es = require("event-stream");

var processes = {};
var waitingOn, columns, rows, tiles, mines, board, clicked, flagged;
var previouslyChecked = [];
var color = {};
color.Reset = "\x1b[0m";
color.Bright = "\x1b[1m";
color.Dim = "\x1b[2m";
color.Underscore = "\x1b[4m";
color.Blink = "\x1b[5m";
color.Reverse = "\x1b[7m";
color.Hidden = "\x1b[8m";

color.FgBlack = "\x1b[30m";
color.FgRed = "\x1b[31m";
color.FgBrightRed = "\x1b[91m";
color.FgGreen = "\x1b[32m";
color.FgBrightGreen = "\x1b[92m";
color.FgYellow = "\x1b[33m";
color.FgBlue = "\x1b[34m";
color.FgBrightBlue = "\x1b[94m";
color.FgMagenta = "\x1b[35m";
color.FgBrightMagenta = "\x1b[95m";
color.FgCyan = "\x1b[36m";
color.FgWhite = "\x1b[37m";

color.BgBlack = "\x1b[40m";
color.BgRed = "\x1b[41m";
color.BgGreen = "\x1b[42m";
color.BgYellow = "\x1b[43m";
color.BgBlue = "\x1b[44m";
color.BgMagenta = "\x1b[45m";
color.BgCyan = "\x1b[46m";
color.BgWhite = "\x1b[47m";

console.log("\n\n\n\nYou may enter `exit` at any time to quit, or `reset` to reset the game.");
console.log("When `clicking` if you lead the coordinates with an `!`\nit will toggle that tile as a potential mine. (e.g.: !3,4)\n");
init();

process.stdin.pipe(es.split()).on("data", processInput);

function processInput(input){
	if(input.toString().toLowerCase() == "exit"){
		exit();
		return;
	}
	else if(input.toString().toLowerCase() == "reset"){
		console.log("\nResetting...");
		init();
		return;
	}
	
	if(processes[waitingOn]){
		processes[waitingOn](input);
	}
	else{
		console.log("\nProcess `" + waitingOn + "` is not defined.");
		exit();
	}
}

function buildGameBoard(){
	var tempBoardRow = [];
	var tempClickedRow = [];
	var tempFlaggedRow = [];
	var mineList = [];
	var x, y, temp;
	for(x = 0; x < tiles; x++){
		mineList.push(x);
	}
	
	for (x = mineList.length - 1; x > 0; x--) {
		y = Math.floor(Math.random() * (x + 1));
		temp = mineList[x];
		mineList[x] = mineList[y];
		mineList[y] = temp;
	}
	mineList = mineList.slice(0, mines);
	
	var counter = 0;
	for(var x = 0; x < columns; x++){
		tempBoardRow = [];
		tempClickedRow = [];
		tempFlaggedRow = [];
		for(var y = 0; y < rows; y++){
			if(mineList.indexOf(counter) > -1){
				tempBoardRow.push(1);
			}
			else{
				tempBoardRow.push(0);
			}
			tempClickedRow.push(0);
			tempFlaggedRow.push(0);
			counter++;
		}
		board.push(tempBoardRow);
		clicked.push(tempClickedRow);
		flagged.push(tempFlaggedRow);
	}
	displayBoard();
}

function displayBoard(){
	var outputString = "\n  |";
	for(var x = 1; x <= columns; x++){
		if((x + 1) <= 10){
			outputString += " " + x + " |";
		}
		else{
			outputString += " " + x + "|";
		}
	}
	console.log(outputString);
	outputString = "———";
	for(var t = 0; t < columns; t++){
		outputString += "————";
	}
	console.log(outputString);
	for(var y = 0; y < rows; y++){
		if((y + 1) <= 9){
			outputString = (y + 1) + " |";
		}
		else{
			outputString = (y + 1) + "|";
		}
		for(var x = 0; x < columns; x++){
			if(clicked[x][y] === 0){
				if(flagged[x][y] === 0){
					outputString += " " + "X |";
				}
				else{
					outputString += " " + color.FgBrightGreen + "!" + color.Reset + " |";
				}
			}
			else{
				if(board[x][y] === 1){
					outputString += " " + color.FgBrightRed + "O" + color.Reset + " |";
				}
				else{
					var count = getSurroundingCount(x, y);
					if(count === 0){
						outputString += "   |";
					}
					else{
						outputString += " " + getColorFromCount(count) + count + color.Reset + " |";
					}
				}
			}
		}
		outputString += (y + 1);
		
		console.log(outputString);
		outputString = "———";
		for(var t = 0; t < columns; t++){
			outputString += "————";
		}
		console.log(outputString);
	}
	outputString = "  |";
	for(var x = 1; x <= columns; x++){
		if((x + 1) <= 10){
			outputString += " " + x + " |";
		}
		else{
			outputString += " " + x + "|";
		}
	}
	console.log(outputString);
}

function getRemainingMines(){
	var count = 0;
	for(var x = 0; x < columns; x++){
		for(var y = 0; y < rows; y++){
			if(flagged[x][y] === 1){
				count++;
			}
		}
	}
	return (mines - count);
}

function click(x, y){
	clicked[x][y] = 1;
	flagged[x][y] = 0;
	if(board[x][y] === 1){
		lost();
		return false;
	}
	else{
		if(checkForWin()){
			won();
			return false;
		}
	}
	return true;
}

function flag(x, y){
	if(clicked[x][y] === 0){
		if(flagged[x][y] === 0){
			flagged[x][y] = 1;
		}
		else{
			flagged[x][y] = 0;
		}
	}
}

function getSurroundingCount(coordX, coordY){
	var count = 0;
	for(var x = coordX - 1; x <= coordX + 1; x++){
		for(var y = coordY - 1; y <= coordY + 1; y++){
			if((x >= 0) && (x < columns)){
				if((y >= 0) && (y < rows)){
					if((x != coordX) || (y != coordY)){
						if(board[x][y] == 1){
							count++;
						}
					}
				}
			}
		}
	}
	return count;
}

function clearSurrounding(coordX, coordY){
	for(var x = coordX - 1; x <= coordX + 1; x++){
		for(var y = coordY - 1; y <= coordY + 1; y++){
			if((x >= 0) && (x < columns)){
				if((y >= 0) && (y < rows)){
					if((x != coordX) || (y != coordY)){
						if(previouslyChecked.indexOf(x + "," + y) === -1){
							previouslyChecked.push(x + "," + y);
							if(board[x][y] === 0){
								click(x, y);
								
								if(getSurroundingCount(x, y) === 0){
									clearSurrounding(x, y);
								}
							}
						}
					}
				}
			}
		}
	}
}

function getColorFromCount(count){
	switch(count){
		case 1:
			return color.FgGreen;
			
		case 2:
			return color.FgYellow;
			
		case 3:
			return color.FgCyan;
			
		case 4:
			return color.FgBrightBlue;
			
		case 5:
			return color.FgBlue;
			
		case 6:
			return color.FgMegenta;
			
		case 7:
			return color.FgBrightMagenta;
			
		case 8:
			return color.FgRed;
			
		default:
			return color.reset;
	}
}

function exit(){
	console.log("\nExiting...\n");
	process.exit();
}

function init(){
	board = [];
	clicked = [];
	flagged = [];
	console.log("\nHow many columns would you like the board to be? MIN: 2, MAX: 99");
	waitingOn = "columnCount";
}

function replay(){
	board = [];
	clicked = [];
	flagged = [];
	buildGameBoard();
	console.log("\nWhere would you like to click? Please enter coordinates in the manner of: x,y");
	waitingOn = "click";
}

function lost(){
	displayBoard();
	console.log("\nOops! That was a mine! X.X");
	console.log("Would you like to play again? [Y/N]");
	waitingOn = "replayConfirm";
}

function won(){
	console.log("\nGreat job! You cleared the mine field!!");
	console.log("Would you like to play again? [Y/N]");
	waitingOn = "replayConfirm";
}

function checkForWin(){
	for(var x = 0; x < columns; x++){
		for(var y = 0; y < rows; y++){
			if(board[x][y] === 0){
				if(clicked[x][y] === 0){
					return false;
				}
			}
		}
	}
	return true;
}

processes["columnCount"] = function(input){
	input = input.toString();
	if(/^\d+$/.test(input)){
		if((input > 1) && (input < 100)){
			columns = input;
			console.log("\nHow many rows would you like the board to be? MIN: 2, MAX: 99");
			waitingOn = "rowCount";
		}
		else{
			console.log("Please enter a number from 2 to 99.");
		}
	}
	else{
		console.log("Please enter a numerical value.");
	}
}

processes["rowCount"] = function(input){
	input = input.toString();
	if(/^\d+$/.test(input)){
		if((input > 1) && (input < 100)){
			rows = input;
			tiles = columns * rows;
			waitingOn = "mineCount";
			console.log("\nHow many mines would you like on your board? It must be from 2 to " + (tiles - 1) + ".");
		}
		else{
			console.log("Please enter a number from 2 to 99.");
		}
	}
	else{
		console.log("\nPlease enter a numerical value.");
	}
}


processes["mineCount"] = function(input){
	input = input.toString();
	if(/^\d+$/.test(input)){
		if((input > 1) && (input < tiles)){
			mines = input;
			console.log("\nYou chose a board that is " + tiles + " tiles large with " + Math.floor((mines / tiles) * 100) + "% of them being mines.");
			buildGameBoard();
			console.log("\nDo you wish to continue with this board? [Y/N]");
			waitingOn = "boardConfirm";
		}
		else{
			console.log("\nPlease enter a number that from 2 to " + (tiles - 1) + ".");
		}
	}
	else{
		console.log("\nPlease enter a numerical value.");
	}
}


processes["boardConfirm"] = function(input){
	input = input.toString();
	if(input.toLowerCase() == "y"){
		console.log("\nTotal mines: " + mines);
		console.log("Remaining mines: " + getRemainingMines());
		displayBoard();
		console.log("\nWhere would you like to click? Please enter coordinates in the manner of: x,y");
		waitingOn = "click";
	}
	else{
		console.log("\nResetting...");
		init();
	}
}

processes["click"] = function(input){
	var setFlag = false;
	input = input.toString();
	if(input[0] == "!"){
		setFlag = true;
		input = input.slice(1);
	}
	
	if(input.indexOf(",") > -1){
		var coords = input.split(",");
		if(coords.length == 2){
			var x = coords[0]-1;
			var y = coords[1]-1;
			if((/^\d+$/.test(x)) && (/^\d+$/.test(y))){
				if((x >= 0) && (x < columns)){
					if((y >= 0) && (y < rows)){
						previouslyChecked = [];
						if(setFlag){
							flag(x, y);
						}
						else{
							if(!click(x, y)){ //Returns false if game is over
								return;
							}
							if(getSurroundingCount(x, y) === 0){
								clearSurrounding(x, y);
							}
						}
						console.log("\nTotal mines: " + mines);
						console.log("Remaining mines: " + getRemainingMines());
						displayBoard();
						console.log("\nWhere would you like to click? Please enter coordinates in the manner of: x,y");
					}
					else{
						console.log("\nPlease enter coordinates within range of the board.");
					}
				}
				else{
					console.log("\nPlease enter coordinates within range of the board.");
				}
			}
			else{
				console.log("\nPlease enter numerical values for the coordinates.");
			}
		}
		else{
			console.log("\nPlease enter the coordinates in the manner of: x,y");
		}
	}
	else{
		console.log("\nPlease enter the coordinates in the manner of: x,y");
	}
}

processes["replayConfirm"] = function(input){
	input = input.toString();
	if(input.toLowerCase() == "y"){
		console.log("\nRestarting...");
		replay();
	}
	else{
		exit();
	}
}

