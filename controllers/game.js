'use strict';

(angular
    .module(appName)
    .controller('GameCtrl', function($scope, $interval, $sce)
	{
		const savedDiff = localStorage.getItem('difficulty');
		const savedTheme = localStorage.getItem('theme');
		const savedSound = localStorage.getItem('sound');

		let gameStarted = false;
		let gridSizeW = 0;
		let gridSizeH = 0;
		let gridMines = 0;
		let gameTimer = null;
		let totalCells = 0;
		let clearCells = 0;
		let firstLoad = true;

		$scope.gridPresets = {
			'B': {'name': 'Beginner',     'w': 9,  'h': 9,  'm': 10},
			'I': {'name': 'Intermediate', 'w': 16, 'h': 16, 'm': 40},
			'E': {'name': 'Expert',       'w': 30, 'h': 16, 'm': 99},
			'C': {'name': 'Custom...'},
		};

		$scope.themesList = THEMES;
		$scope.currentTheme = (savedTheme || 'default');
		$scope.currentDiff = (savedDiff || 'I');
		$scope.timeCount = 0;
		$scope.flagCount = 0;
		$scope.faceState = 'face';
		$scope.gridRows = [];
		$scope.showMines = false;
		$scope.gameIsOver = false;
		$scope.soundOn = (savedSound == 'Y' || !savedSound);
		$scope.showDialogue = false;
		$scope.customGrid = {'width': 12, 'height': 12, 'mines': 48};

		$scope.dlgPopup = {
			top: '',
			width: '',
			height: '',
			title: '',
			template: '',
			noCloseBtn: false,
			important: false,
		};

		function playSound(fileName) {
			if ($scope.soundOn) {
				const dir = './themes/' + $scope.currentTheme + '/';
				const aud = new Audio();

				aud.src = [dir + fileName];
				aud.volume = '0.5';
				aud.play();
			}
		}

		$scope.dlgFormFields = [];

		function openDialogue(config) {
			$scope.dlgPopup.top = (config.top || '0px');
			$scope.dlgPopup.width = config.width + 'px';
			$scope.dlgPopup.height = config.height + 'px';
			$scope.dlgPopup.left = (-1 * (config.width / 2)) + 'px';
			$scope.dlgPopup.title = (config.title || '');
			$scope.dlgPopup.template = $sce.trustAsHtml(config.template);
			$scope.dlgPopup.noCloseBtn = (config.noCloseButton || false);
			$scope.dlgPopup.important = (config.important || false),
			$scope.dlgFormFields = [];
			$scope.showDialogue = true;
		}

		function generateGrid(preset, customW, customH, customM) {
			let cellIndex = 0;

			if (preset == 'C') {
				gridSizeW = customW;
				gridSizeH = customH;
				gridMines = customM;
			}
			else {
				gridSizeW = $scope.gridPresets[preset].w;
				gridSizeH = $scope.gridPresets[preset].h;
				gridMines = $scope.gridPresets[preset].m;
			}

			if (!firstLoad)
				playSound('start.wav');

			firstLoad = false;
			gameStarted = false;
			totalCells = (gridSizeW * gridSizeH);
			clearCells = 0;

			$scope.currentDiff = preset;
			$scope.flagCount = gridMines;
			$scope.showMines = false;
			$scope.faceState = 'face';
			$scope.gridRows = [];

			for (let y = 1; y <= gridSizeH; y++) {
				let row = [];

				for (let x = 1; x <= gridSizeW; x++) {
					row.push({
						'x': x,
						'y': y,
						'edge_N': (y == 1),
						'edge_E': (x == gridSizeW),
						'edge_S': (y == gridSizeH),
						'edge_W': (x == 1),
						'index': cellIndex,
						'mined': false,
						'danger': 0,
						'flag': 0,
						'clicked': false,
						'tripped': false,
					});

					cellIndex++;
				}

				$scope.gridRows.push(row);
			}
		}

		function customGameDialogue() {
			openDialogue({
				width: 200,
				height: 0,
				top: '30%',
				title: 'Custom Game',
			});

			$scope.dlgFormFields.push({
				'type': 'text',
				'model': $scope.customGrid.width,
				'placeholder': 'Width',
			});

			$scope.dlgFormFields.push({
				'type': 'text',
				'model': $scope.customGrid.height,
				'placeholder': 'Height',
			});

			$scope.dlgFormFields.push({
				'type': 'text',
				'model': $scope.customGrid.mines,
				'placeholder': 'Mines',
			});

			$scope.dlgFormFields.push({
				'type': 'button',
				'click': {'fn': customGameSubmit},
				'html': $sce.trustAsHtml('Start'),
			});
		}

		function customGameSubmit() {
			const gridW = $scope.customGrid.width;
			const gridH = $scope.customGrid.height
			const gridM = $scope.customGrid.mines;

			generateGrid('C', gridW, gridH, gridM);
		}

		function plantMines() {
			let minesPlanted = 0;

			while (minesPlanted < gridMines) {
				const mineX = Math.floor(Math.random() * gridSizeW);
				const mineY = Math.floor(Math.random() * gridSizeH);

				let minePlanted = false;

				for (const row of $scope.gridRows) {
					for (const cell of row) {
						if ((cell.x == mineX && cell.y == mineY) && !cell.mined && !cell.clicked) {
							cell.mined = true;
							minePlanted = true;
							minesPlanted++;
							break;
						}
					}

					if (minePlanted)
						break;
				}
			}
		}

		function setGameTimer(start) {
			if (start) {
				gameTimer = $interval(() => {
					$scope.timeCount++;
				}, 1000);
			}
			else {
				$interval.cancel(gameTimer);
			}
		}

		function selectCell(cell, autoSelect) {
			if (cell.flag == 1 || cell.clicked)
				return;

			cell.flag = 0;

			if (!autoSelect)
				playSound('click.wav');

			if (gameStarted) {
				if (cell.mined) {
					cell.tripped = true;

					gameOver(false);
				}
				else {
					cell.clicked = true;
					clearCells++;

					setCellDanger(cell);
				}
			}
			else {
				gameStarted = true;
				cell.clicked = true;
				clearCells++;

				plantMines();
				setGameTimer(true);
				setCellDanger(cell);
			}

			if (clearCells == (totalCells - gridMines))
				gameOver(true);
		}

		function setCellFlag(cell) {
			if (!cell.clicked) {
				if (cell.flag == 0 && $scope.flagCount > 0) {
					cell.flag = 1;
					$scope.flagCount--;
				}
				else if (cell.flag == 1) {
					cell.flag = 2;
					$scope.flagCount++;
				}
				else if (cell.flag == 2) {
					cell.flag = 0;
				}
			}
		}

		function setCellDanger(cell) {
			const cellIdx = cell.index;
			const cellN = cellIdx - gridSizeW;
			const cellE = cellIdx + 1;
			const cellS = cellIdx + gridSizeW;
			const cellW = cellIdx - 1;
			const cellNE = cellN + 1;
			const cellNW = cellN - 1;
			const cellSE = cellS + 1;
			const cellSW = cellS - 1;

			let minesNear = 0;

			if (!cell.edge_N) minesNear += isCellMined(cellN);
			if (!cell.edge_N && !cell.edge_E) minesNear += isCellMined(cellNE);
			if (!cell.edge_E) minesNear += isCellMined(cellE);
			if (!cell.edge_E && !cell.edge_S) minesNear += isCellMined(cellSE);
			if (!cell.edge_S) minesNear += isCellMined(cellS);
			if (!cell.edge_S && !cell.edge_W) minesNear += isCellMined(cellSW);
			if (!cell.edge_W) minesNear += isCellMined(cellW);
			if (!cell.edge_W && !cell.edge_N) minesNear += isCellMined(cellNW);

			cell.danger = minesNear;

			if (minesNear == 0) {
				if (!cell.edge_N) autoSelectCell(cellN);
				if (!cell.edge_N && !cell.edge_E) autoSelectCell(cellNE);
				if (!cell.edge_E) autoSelectCell(cellE);
				if (!cell.edge_E && !cell.edge_S) autoSelectCell(cellSE);
				if (!cell.edge_S) autoSelectCell(cellS);
				if (!cell.edge_S && !cell.edge_W) autoSelectCell(cellSW);
				if (!cell.edge_W) autoSelectCell(cellW);
				if (!cell.edge_W && !cell.edge_N) autoSelectCell(cellNW);
			}
		}

		function isCellMined(cellIdx) {
			let cellFound = false;
			let cellMined = 0;

			for (const row of $scope.gridRows) {
				for (const cell of row) {
					if (cell.index == cellIdx) {
						if (cell.mined)
							cellMined = 1;

						cellFound = true;
						break;
					}
				}

				if (cellFound)
					break;
			}

			return cellMined;
		};

		function autoSelectCell(cellIdx) {
			let cellFound = false;
			let cellSelect = false;

			for (const row of $scope.gridRows) {
				for (const cell of row) {
					if (cell.index == cellIdx) {
						cellSelect = cell;
						cellFound = true;
						break;
					}
				}

				if (cellFound)
					break;
			}

			if (cellSelect)
				selectCell(cellSelect, true);
		}

		function gameOver(win) {
			if ($scope.gameIsOver)
				return;

			$scope.gameIsOver = true;
			$scope.showMines = true;

			if (win) {
				if ($scope.currentDiff == 'E')
					$scope.faceState = 'win2';
				else
					$scope.faceState = 'win1';

				playSound('win.wav');
			}
			else {
				$scope.faceState = 'lose';

				playSound('boom.wav');
				playSound('lose.wav');
			}

			setGameTimer(false);
		}

		$scope.cellPress = function(event, cell) {
			const mouseBtn = event.button;

			if ($scope.gameIsOver || cell.clicked)
				return;

			if (mouseBtn == 0 && !cell.flag)
				$scope.faceState = 'gasp';
		};

		$scope.cellClick = function(event, cell) {
			const mouseBtn = event.button;

			if ($scope.gameIsOver)
				return;

			$scope.faceState = 'face';

			switch (mouseBtn) {
				case 0: {
					selectCell(cell);
					break;
				}
				case 2: {
					setCellFlag(cell);
					break;
				}
			}
		};

		$scope.toggleSound = function() {
			$scope.soundOn = !$scope.soundOn;

			localStorage.setItem('sound', ($scope.soundOn) ? 'Y' : 'N');
		};

		$scope.showAboutDlg = function() {
			openDialogue({
				width: 200,
				height: 120,
				top: '30%',
				title: 'About',
				template:
					'<strong>Minesweeper</strong>' +
					'<br />' +
					'<br />' +
					'Version 1.0' +
					'<br />' +
					'Ben Meakings' +
				'',
			});
		};

		$scope.dialogueOverlayClick = function() {
			if (!$scope.dlgPopup.important)
				$scope.closeDialogue();
		};

		$scope.closeDialogue = function() {
			$scope.showDialogue = false;
		};

		$scope.newGame = function() {
			$scope.gameIsOver = false;
			$scope.timeCount = 0;

			setGameTimer(false);
			generateGrid($scope.currentDiff);
			localStorage.setItem('difficulty', $scope.currentDiff);
		};

		$scope.$watch('customGrid', function(newVal) {
			console.log(newVal);
		});

		$scope.$watch('currentTheme', function(newVal) {
			const newTheme = './themes/' + newVal + '/theme.css';

			document.querySelector('#themeStylesheet').href = newTheme;
			localStorage.setItem('theme', newVal);
		});

		$scope.$watch('currentDiff', function(newVal) {
			if (newVal == 'C')
				customGameDialogue();
			else
				$scope.newGame();
		});
	})
);
