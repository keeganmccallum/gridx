define([
	"intern/node_modules/dojo/node!fs",
	"intern/node_modules/dojo/node!path",
	"intern/node_modules/dojo/node!./config.js",
	"intern/node_modules/dojo/node!wd",
	"intern/chai!assert"
], function(fs, path, config, wd, assert){

/*=====
function getScreenshot(name){
	// take a screen shot and save to memory, name it to "name"
}

function assertEqualShots(name1, name2, comment){
	// compare previously saved 2 screen shots, if not equal, raise exception and save both screenshots to disk
}

function assertScreenshot(name){
	// take a screen shot and compare it to the reference screenshot
	// If no reference screenshot, meke this one be the reference screenshot
}

function vScrollGridx(startPos, moveDistance){
	// use mouse to drag the scroll bar to scroll the grid virtically
	// can not know where the scroll bar is, so must provide start position
}

function hScrollGridx(startPos, moveDistance){
	// use mouse to drag the scroll bar to scroll the grid horizontally
	// can not know where the scroll bar is, so must provide start position
}

function cellById(rowId, columnId){
	// convenient way to get a grid cell
}

function headerCellById(columnId){
	// convenient way to get a grid header cell
}

function resetMouse(){
	// move mouse to the up-right cornor of page.
}

=====*/

	if(!fs.existsSync(config.screenshotDir)){
		fs.mkdirSync(config.screenshotDir);
	}
	if(!fs.existsSync(config.refScreenshotDir)){
		fs.mkdirSync(config.refScreenshotDir);
	}

	function getPicPaths(name, remote){
		var names = wrap.context.slice();
		if(name){
			names.push(name);
		}
		var browserName = remote._desiredEnvironment.browserName;
		var picName = names.join('~') + '.png';

		var screenshotDir = path.join(config.screenshotDir, browserName);
		if(!fs.existsSync(screenshotDir)){
			fs.mkdirSync(screenshotDir);
		}
		var refScreenshotDir = path.join(config.refScreenshotDir, browserName);
		if(!fs.existsSync(refScreenshotDir)){
			fs.mkdirSync(refScreenshotDir);
		}

		return {
			picPath: path.join(screenshotDir, picName),
			refPicPath: path.join(refScreenshotDir, picName)
		};
	}

	function getScreenshot(name){
		var picData;
		var t = this;
		return this.execute('hideMiscellany();').
			wait(200).
			takeScreenshot().
			then(function(pic){
				picData = pic;
				if(name){
					t._screenshots = t._screenshots || {};
					t._screenshots[name] = pic;
				}
			}).
			execute('showMiscellany();').
			then(function(){
				return picData;
			});
	}

	function assertEqualShots(name1, name2, comment){
		var t = this;
		return t.then(function(){
			if(t._screenshots){
				var pic1 = t._screenshots[name1];
				var pic2 = t._screenshots[name2];
				var isEqual = pic1 === pic2;
				if(!isEqual){
					var picPath1 = getPicPaths(name1, t).picPath;
					var picPath2 = getPicPaths(name2, t).picPath;
					fs.writeFileSync(picPath1, pic1, 'base64');
					fs.writeFileSync(picPath2, pic2, 'base64');
				}
				assert(isEqual, comment);
			}
		});
	}

	function assertScreenshot(name){
		var picPaths = getPicPaths(name, this);
		var picData;
		return this.execute('hideMiscellany();').
			wait(200).
			takeScreenshot().
			then(function(pic){
				picData = pic;
			}).
			execute('showMiscellany();').
			then(function(){
				var needCompare = 0;
				if(fs.existsSync(picPaths.refPicPath) && !config.isRecording){
					needCompare = 1;
					var refPic = fs.readFileSync(picPaths.refPicPath, 'base64');
					var picsAreEqual = picData == refPic;
					if(!picsAreEqual){
						fs.writeFileSync(picPaths.picPath, picData, 'base64');
					}else if(fs.existsSync(picPaths.picPath)){
						fs.unlinkSync(picPaths.picPath);
					}
				}else{
					fs.writeFileSync(picPaths.refPicPath, picData, 'base64');
				}
				if(needCompare){
					assert(picsAreEqual, 'screenshot changed');
				}
				return picData;
			});
	}

	function getScrollArgs(remote){
		return {
			offsetH: 9,
			offsetW: 21
		};
	}

	function vScroll(start, distance){
		var browserName = this._desiredEnvironment.browserName;
		if(browserName == 'internet explorer'){
			var t = this;
			return this.end().
				execute('return [grid.vScrollerNode.clientHeight, grid.vScrollerNode.scrollHeight, grid.vScrollerNode.scrollTop];').
				then(function(res){
					var totalScrollLength = res[1] - res[0];
					var draggableLength = totalScrollLength / res[1] * res[0];
					var d = Math.floor(distance / draggableLength * totalScrollLength);
					return t.execute('return grid.vScrollerNode.scrollTop += ' + d);
				});
		}else{
			var scroll = getScrollArgs(this);
			return this.end().
				elementByClassName('gridxVScroller').
				moveTo(scroll.offsetH, scroll.offsetW + start).
				buttonDown().
				moveTo(scroll.offsetH, scroll.offsetW + start + distance).
				buttonUp().
				end().
				elementByTagName('body').
				moveTo(0, 0).
				end();
		}
	}

	function hScroll(start, distance){
		var browserName = this._desiredEnvironment.browserName;
		if(browserName == 'internet explorer'){
			var t = this;
			return this.end().
				execute('return [grid.hScrollerNode.clientWidth, grid.hScrollerNode.scrollWidth, grid.hScrollerNode.scrollLeft];').
				then(function(res){
					var totalScrollLength = res[1] - res[0];
					var draggableLength = totalScrollLength / res[1] * res[0];
					var d = Math.floor(distance / draggableLength * totalScrollLength);
					return t.execute('return grid.hScrollerNode.scrollLeft += ' + d);
				});
		}else{
			var scroll = getScrollArgs(this);
			return this.end().
				elementByClassName('gridxHScrollerInner').
				getSize().
				moveTo(scroll.offsetW + start, scroll.offsetH).
				buttonDown().
				moveTo(scroll.offsetW + start + distance, scroll.offsetH).
				buttonUp().
				end().
				elementByTagName('body').
				moveTo(0, 0).
				end();
		}
	}

	function cellById(rowId, colId){
		return this.end().
			elementByCss('[rowid="' + rowId + '"].gridxRow [colid="' + colId + '"].gridxCell');
	}

	function headerCellById(colId){
		return this.end().
			elementByCss('.gridxHeader [colid="' + colId + '"].gridxCell');
	}

	function resetMouse(){
		return this.end().
			elementByTagName('body').
			moveTo(0, 0).
			end().
			wait(500);
	}

	function wrap(cb){
		return function(){
			var remote = this.remote;
			remote.getScreenshot = getScreenshot;
			remote.assertEqualShots = assertEqualShots;
			remote.assertScreenshot = assertScreenshot;
			remote.vScrollGridx = vScroll;
			remote.hScrollGridx = hScroll;
			remote.cellById = cellById;
			remote.resetMouse = resetMouse;
			remote.headerCellById = headerCellById;
			remote.SPECIAL_KEYS = wd.SPECIAL_KEYS;
			return cb && cb.apply(this, arguments);
		};
	}

	wrap.context = [];
	return wrap;
});