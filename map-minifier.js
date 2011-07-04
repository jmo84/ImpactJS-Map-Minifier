ig.module(
	'plugins.map-minifier'
)
.requires(
	'impact.game'
)
.defines(function(){
	
	ig.MapMinifier = ig.Class.extend({

		init: function() {
		},
		
		compress: function(layer) {
		},
		
		decompress: function(layer) {
		}
		
	});
	
	ig.MapMinifierRle = ig.MapMinifier.extend({

		init: function() {
			this.parent();

		},
		
		compress: function(map) {
			
			var source = ig.copy(map.data);
			
			var table = {};
			var lastRow = '?';
			var rowCount = 0;
			
			this.compressedMap = '';
			
			for (var r = 0; r < source.length; r++) {
			
				var row = source[r];
				
				var lastValue = -1;
				var valueCount = 0;
				this.compressedCellCount = 0;
				this.compressedRow = '';
				
				for (var c = 0; c < row.length; c++) {
				
					var cell = row[c];
					if (cell != lastValue) {
						
						if (lastValue >= 0) {
							this.addCompressedTiles(lastValue, valueCount);
						}
						
						lastValue = cell;
						valueCount = 1;
						
					} else {
					
						valueCount++;
						
					}
					
				}

				this.addCompressedTiles(lastValue, valueCount);
				
				if (this.compressedRow != lastRow) {
					if (lastRow != '?') {
						this.addCompressedRows(lastRow, rowCount);
					}
					lastRow = this.compressedRow;
					rowCount = 1;
				} else {
					rowCount++;
				}
				
			}
			
			this.addCompressedRows(lastRow, rowCount);

			return this.compressedMap;
			
		},
		
		decompress: function(map) {

			var source = map.dataCompressed;
			
			var compressedRows = source.split('/');
			var uncompressedData = [];
			
			for (var i = 0; i < compressedRows.length; i++) {
				
				var rowCount = parseInt(compressedRows[i]);
				var rowData = compressedRows[++i];
				
				var plainRowData = this.decompressRow(rowData);
				
				for (j = 0; j < rowCount; j++) {
					uncompressedData.push(plainRowData);
				}
				
			}

			map.data = uncompressedData;

		},
		
		decompressRow: function(rowData) {
		
			var segments = rowData.split(',');
			var a = [];
			
			for (var s = 0; s < segments.length; s++) {
				
				var segment = segments[s];
				var cell = 0;
				
				if (segment.indexOf('x') > -1) {

					var xparts = segment.split('x');
					var tile = parseInt(xparts[0]);
					var count = parseInt(xparts[1]);

					for (var n = 0; n < count; n++) {
						a.push(tile);
					}
					
				} else {
					a.push(parseInt(segment));
				}
				
			}
			
			return a;
			
		},
		
		addCompressedTiles: function(tile, count) {

			if (this.compressedCellCount > 0) {
				this.compressedRow += ',';
			}
			
			
			this.compressedRow += tile.toString();
			
			if (count > 1) {
				this.compressedRow += 'x' + count.toString();
			}
			
			this.compressedCellCount++;
		},
		
		addCompressedRows: function(rowData, count) {
			
			if (this.compressedMap.length > 0) {
				this.compressedMap += '/';
			}
			
			this.compressedMap += count.toString() + '/' + rowData;
			
		}
		
		
			
	});
	
	ig.MapMinifier.compressionTypeDefault = 'RLE';
	
	ig.MapMinifier.compressionTypes = {
		RLE: ig.MapMinifierRle
	};
	
	ig.MapMinifier.compressLayer = function(layer, type) {
	
		var compType = type || ig.MapMinifier.compressionTypeDefault;
		var minifierClass = ig.MapMinifier.compressionTypes[compType];
		
		var minifier = new minifierClass();
		
		layer.dataCompressed = minifier.compress(layer);
		layer.dataFormat = compType;
		delete layer.data;
		
		
	};
	
	ig.MapMinifier.decompressLayer = function(layer) {
		
		if (!layer.dataFormat || !layer.dataCompressed) {
			return;
		}
		
		var minifierClass = ig.MapMinifier.compressionTypes[layer.dataFormat];
		var minifier = new minifierClass();
		
		minifier.decompress(layer);
		
		delete layer.dataFormat;
		delete layer.dataCompressed;
					
	};
	
	ig.MapMinifier.enableForGame = function() {
		
		if (ig.MapMinifier.isGameEnabled) {
			return;
		}
		
		ig.MapMinifier.isGameEnabled = true;
		
		ig.Game.inject({
		
			loadLevel: function(level) {
			
				for (var i = 0; i < level.layer.length; i++) {
					ig.MapMinifier.decompressLayer(level.layer[i]);
				}

				this.parent(level);
				
			}
			
		});
		
	};
	
	ig.MapMinifier.enableForWeltmeister = function() {
		
		if (ig.MapMinifier.isWmEnabled) {
			return;
		}
		
		ig.MapMinifier.isWmEnabled = true;
		
		wm.Weltmeister.inject({
		
			loadResponse: function( data ) {
				
				var jsonMatch = data.match( /\/\*JSON\[\*\/([\s\S]*?)\/\*\]JSON\*\// );
				var pj = $.parseJSON( jsonMatch ? jsonMatch[1] : data );
				
				for (var i = 0; i < pj.layer.length; i++) {
					ig.MapMinifier.decompressLayer(pj.layer[i]);
				}

				this.parent($.toJSON(pj));
				
			}
		
		});
		
		wm.EditMap.inject({
		
			getSaveData: function() {
				
				var layer = this.parent();

				if (!layer.dataCompression) {

					ig.MapMinifier.compressLayer(layer);

				}
			
				return layer;
				
			}
			
		});
	
		
	};
	
});
