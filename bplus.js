$.namespace("com.anvesaka.bplus").BTreeNode = Class.extend({
	init:function(options) {
		options = $.extend(true, {
			order:100,
			mergeThreshold:40,
			data:[]
		}, options);
		this._private = options;
	},
	getLeftPeer:function() {
		return this._private.leftPeer;
	},
	setLeftPeer:function(leftPeer) {
		this._private.leftPeer = leftPeer;
	},
	getRightPeer:function() {
		return this._private.rightPeer;
	},
	setRightPeer:function(rightPeer) {
		this._private.rightPeer = rightPeer;
	},
	getData:function() {
		return this._private.data;
	},
	getSurplus:function() {
		return Math.max(0, Math.floor((this._private.data.length-this._private.mergeThreshold)/2));
	},
	getRightSurplusData:function() {
		var surplus = this.getSurplus();
		return this._private.data.splice(this._private.data.length-surplus);
	},
	getLeftSurplusData:function() {
		var surplus = this.getSurplus();
		return this._private.data.splice(0, surplus);
	}
});

$.namespace("com.anvesaka.bplus").BTreeInternalNode = com.anvesaka.bplus.BTreeNode.extend({
	init:function(options) {
		options = $.extend(true, {
		}, options);
		this._super(options);
		var thiz = this;
	},
	findIndex:function(key) {
		var left = 0;
		var right = this._private.data.length-1;
		var mid = left+Math.floor((right-left)/2);
		var found = false;
		do {
			mid = left+Math.floor((right-left)/2);
			if (this._private.data[mid].key===key) {
				found = true;
			}
			else if (this._private.data[mid].key<key) {
				left = mid+1;
			}
			else {
				right = mid;
			}
		} while (left<right&&!found);
		if (found) {
			return mid;
		}
		else {
			return right;
		}
	},
	findChild:function(key) {
		var index = this.findIndex(key);
		var element = this._private.data[index];
		var child;
		if (element.key<=key) {
			child = element.right;
		}
		else {
			child = element.left;
		}
		return child;
	},
	insert:function(key, value) {
		var index = this.findIndex(key);
		var element = this._private.data[index];
		var child;
		var newNodes;
		if (element.key<=key) {
			child = element.right;
			newNodes = child.insert(key, value);
			if (newNodes.length==3) {
				var leftElement = {
					key:element.key,
					left:element.left,
					right:newNodes[0]
				};
				var rightElement = {
					key:newNodes[1],
					left:newNodes[0],
					right:newNodes[2]
				};
				this._private.data.splice(index, 1, leftElement, rightElement);
				return this.split();
			}
		}
		else {
			child = element.left;
			newNodes = child.insert(key, value);
			if (newNodes.length==3) {
				var leftElement = {
					key:newNodes[1],
					left:newNodes[0],
					right:newNodes[2]
				};
				var rightElement = {
					key:element.key,
					left:newNodes[2],
					right:element.right
				};
				this._private.data.splice(index, 1, leftElement, rightElement);
				return this.split();
			}
		}
		return [];
	},
	split:function() {
		if (this._private.data.length<this._private.order) {
			return [];
		}
		var splitIndex = Math.floor(this._private.data.length/2);
		var leftNode = new com.anvesaka.bplus.BTreeInternalNode({
			data:this._private.data.slice(0, splitIndex),
			leftPeer:this._private.leftPeer,
			order:this._private.order,
			mergeThreshold:this._private.mergeThreshold,
		});
		var rightNode = new com.anvesaka.bplus.BTreeInternalNode({
			data:this._private.data.slice(splitIndex+1, this._private.data.length),
			rightPeer:this._private.rightPeer,
			order:this._private.order,
			mergeThreshold:this._private.mergeThreshold,
		});
		leftNode.setRightPeer(rightNode);
		rightNode.setLeftPeer(leftNode);
		if ($.isDefined(this._private.leftPeer)) {
			this._private.leftPeer.setRightPeer(leftNode);
		}
		if ($.isDefined(this._private.rightPeer)) {
			this._private.rightPeer.setLeftPeer(rightNode);
		}
		return [leftNode, this._private.data[splitIndex].key, rightNode];
	},
	remove:function(key, leftMergeOption, rightMergeOption) {
		var index = this.findIndex(key);
		var element = this._private.data[index];
		var mergeIndex = -1;
		var child;
		var newNodes;
		if (element.key<=key) {
			//$.log($.LOG_INFO, "Remove descending right via key "+element.key);
			child = element.right;
			newNodes = child.remove(key, element.left, index<this._private.data.length-1?child.getRightPeer():undefined);
			if (this._private.data.length==1&&newNodes.length==3) {
				return [newNodes[2]];
			}
			if (newNodes.length>0) {
				if (newNodes[0]==1) {
					mergeIndex = index+1;
				}
				else {
					mergeIndex = index;
				}
			}
		}
		else {
			//$.log($.LOG_INFO, "Remove descending left via key "+element.key);
			child = element.left;
			newNodes = child.remove(key, index>0?child.getLeftPeer():undefined, element.right);
			if (this._private.data.length==1&&newNodes.length==3) {
				return [newNodes[2]];
			}
			if (newNodes.length>0) {
				if (newNodes[0]==1) {
					mergeIndex = index;
				}
				else {
					mergeIndex = index-1;
				}
			}
		}
		if (mergeIndex>=0) {
			var mergeElement = this._private.data[mergeIndex];
			if (newNodes.length==4) {
				mergeElement.key = newNodes[2];
				return [];
			}
			else {
				if (mergeIndex>0) {
					this._private.data[mergeIndex-1].right = newNodes[2];
				}
				if (mergeIndex<this._private.data.length-1) {
					this._private.data[mergeIndex+1].left = newNodes[2];
				}
				this._private.data.splice(mergeIndex, 1);
				return this.merge(leftMergeOption, rightMergeOption);
			}
		}
		else {
			return [];
		}
	},
	merge:function(leftMergeOption, rightMergeOption) {
		if (this._private.data.length>this._private.mergeThreshold) {
			return [];
		}
		if ($.isNotDefined(leftMergeOption)&&$.isNotDefined(rightMergeOption)) {
			return [];
		}
		var retVal = [];
		var deficit = true;
		var leftSurplus = 0;
		var leftData;
		var rightSurplus = 0;
		var rightData;
		var leftPeer = this._private.leftPeer;
		var rightPeer = this._private.rightPeer;
		if ($.isDefined(leftMergeOption)) {
			leftData = leftMergeOption.getData();
			leftSurplus = leftMergeOption.getSurplus();
		}
		if ($.isDefined(rightMergeOption)) {
			rightData = rightMergeOption.getData();
			rightSurplus = rightMergeOption.getSurplus();
		}
		if (leftSurplus>rightSurplus) {
			var leftSurplusData = leftMergeOption.getRightSurplusData();
			this._private.data = leftSurplusData.slice(1).concat([{
				key:this._private.data[0].left.getData()[0].key,
				left:leftSurplusData[leftSurplusData.length-1].right,
				right:this._private.data[0].left
			}], this._private.data);
			retVal[0] = -1
			retVal[1] = leftMergeOption;
			retVal[2] = leftSurplusData[0].key;
			retVal[3] = this;
		}
		else if (rightSurplus>leftSurplus) {
			var rightSurplusData = rightMergeOption.getLeftSurplusData();
			this._private.data = this._private.data.concat([{
				key:rightSurplusData[0].left.getData()[0].key,
				left:this._private.data[this._private.data.length-1].right,
				right:rightSurplusData[0].left
			}], rightSurplusData.slice(0, rightSurplusData.length-1));
			retVal[0] = 1
			retVal[1] = this;
			retVal[2] = rightSurplusData[rightSurplusData.length-1].key;
			retVal[3] = rightMergeOption;
		}
		else {
			var mergedInternalNode;
			if ($.isNotDefined(leftData)) {
				mergedInternalNode = new com.anvesaka.bplus.BTreeInternalNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:this._private.data.concat([{
						key:rightData[0].left.getData()[0].key,
						left:this._private.data[this._private.data.length-1].right,
						right:rightData[0].left
					}], rightData)
				});		
				retVal[0] = 1;
				retVal[1] = mergedInternalNode.getData()[0].key
				retVal[2] = mergedInternalNode;
				if ($.isDefined(rightPeer)&&$.isDefined(rightPeer.getRightPeer())) {
					rightPeer.getRightPeer().setLeftPeer(mergedInternalNode);
					mergedInternalNode.setRightPeer(rightPeer.getRightPeer());
				}
				if ($.isDefined(leftPeer)) {
					leftPeer.setRightPeer(mergedInternalNode);
					mergedInternalNode.setLeftPeer(leftPeer);
				}
			} 
			else if ($.isNotDefined(rightData)) {
				mergedInternalNode = new com.anvesaka.bplus.BTreeInternalNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:leftData.concat([{
						key:this._private.data[0].left.getData()[0].key,
						left:leftData[leftData.length-1].right,
						right:this._private.data[0].left
					}], this._private.data)
				});				
				retVal[0] = -1;
				retVal[1] = mergedInternalNode.getData()[0].key
				retVal[2] = mergedInternalNode;
				if ($.isDefined(leftPeer)&&$.isDefined(leftPeer.getLeftPeer())) {
					leftPeer.getLeftPeer().setRightPeer(mergedInternalNode);
					mergedInternalNode.setLeftPeer(leftPeer.getLeftPeer());
				}
				if ($.isDefined(rightPeer)) {
					rightPeer.setLeftPeer(mergedInternalNode);
					mergedInternalNode.setRightPeer(rightPeer);
				}
			}
			else if (rightData.length<leftData.length) {
				mergedInternalNode = new com.anvesaka.bplus.BTreeInternalNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:this._private.data.concat([{
						key:rightData[0].left.getData()[0].key,
						left:this._private.data[this._private.data.length-1].right,
						right:rightData[0].left
					}], rightData)
				});				
				retVal[0] = 1;
				retVal[1] = mergedInternalNode.getData()[0].key
				retVal[2] = mergedInternalNode;
				if ($.isDefined(rightPeer)&&$.isDefined(rightPeer.getRightPeer())) {
					rightPeer.getRightPeer().setLeftPeer(mergedInternalNode);
					mergedInternalNode.setRightPeer(rightPeer.getRightPeer());
				}
				if ($.isDefined(leftPeer)) {
					leftPeer.setRightPeer(mergedInternalNode);
					mergedInternalNode.setLeftPeer(leftPeer);
				}
			}
			else {
				mergedInternalNode = new com.anvesaka.bplus.BTreeInternalNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:leftData.concat([{
						key:this._private.data[0].left.getData()[0].key,
						left:leftData[leftData.length-1].right,
						right:this._private.data[0].left
					}], this._private.data)
				});				
				retVal[0] = -1;
				retVal[1] = mergedInternalNode.getData()[0].key
				retVal[2] = mergedInternalNode;
				if ($.isDefined(leftPeer)&&$.isDefined(leftPeer.getLeftPeer())) {
					leftPeer.getLeftPeer().setRightPeer(mergedInternalNode);
					mergedInternalNode.setLeftPeer(leftPeer.getLeftPeer());
				}
				if ($.isDefined(rightPeer)) {
					rightPeer.setLeftPeer(mergedInternalNode);
					mergedInternalNode.setRightPeer(rightPeer);
				}
			}
		}
		return retVal;
	},
	find:function(key) {
		return this.findChild(key).find(key);
	},
	range:function(start, end) {
		return this.findChild(start).range(start, end);
	},
	toString:function(indent) {
		return this._private.data.map(function(element) {
			return [indent+"[key="+element.key, "\n"+indent+"    LEFT\n"+element.left.toString(indent+"    "), "\n"+indent+"    RIGHT\n"+element.right.toString(indent+"    ")+"\n"+indent+"]"];
		}).join(",\n");
	}
});

$.namespace("com.anvesaka.bplus").BTreeLeafNode = com.anvesaka.bplus.BTreeNode.extend({
	init:function(options) {
		options = $.extend(true, {
		}, options);
		this._super(options);
	},
	findIndex:function(key) {
		if (this._private.data.length==0) {
			return 0;
		}
		var left = 0;
		var right = this._private.data.length;
		var mid = left+Math.floor((right-left)/2);
		var found = false;
		do {
			mid = left+Math.floor((right-left)/2);
			if (this._private.data[mid].key===key) {
				found = true;
			}
			else if (this._private.data[mid].key<key) {
				left = mid+1;
			}
			else {
				right = mid;
			}
		} while (left!==right&&!found);
		if (found) {
			return mid;
		}
		else {
			return left;
		}
	},
	insert:function(key, value) {
		var index = this.findIndex(key);
		var element = this._private.data[index];
		if (index==this._private.data.length) {
			this._private.data.push({
				key:key,
				value:value
			});
		}
		else if (element.key===key) {
			element.value = value;
		}
		/*
		 * This condition may never obtain, given the way findIndex is written
		 */
		else if (element.key<key) {
			this._private.data.splice(index+1, 0, {
				key:key,
				value:value
			});
		}
		else {
			this._private.data.splice(index, 0, {
				key:key,
				value:value
			});
		}
		return this.split();
	},
	split:function() {
		if (this._private.data.length<this._private.order) {
			return [];
		}
		var splitIndex = Math.floor(this._private.data.length/2);
		var leftNode = new com.anvesaka.bplus.BTreeLeafNode({
			data:this._private.data.slice(0, splitIndex),
			leftPeer:this._private.leftPeer,
			order:this._private.order,
			mergeThreshold:this._private.mergeThreshold,
		});
		var rightNode = new com.anvesaka.bplus.BTreeLeafNode({
			data:this._private.data.slice(splitIndex, this._private.data.length),
			rightPeer:this._private.rightPeer,
			order:this._private.order,
			mergeThreshold:this._private.mergeThreshold,
		});
		leftNode.setRightPeer(rightNode);
		rightNode.setLeftPeer(leftNode);
		if ($.isDefined(this._private.leftPeer)) {
			this._private.leftPeer.setRightPeer(leftNode);
		}
		if ($.isDefined(this._private.rightPeer)) {
			this._private.rightPeer.setLeftPeer(rightNode);
		}
		return [leftNode, this._private.data[splitIndex].key, rightNode];
	},
	remove:function(key, leftMergeOption, rightMergeOption) {
		var index = this.findIndex(key);
		var element = this._private.data[index];
		if (index<this._private.data.length&&element.key===key) {
			this._private.data.splice(index, 1);
			return this.merge(leftMergeOption, rightMergeOption);
		}
		else {
			return [];
		}
	},
	merge:function(leftMergeOption, rightMergeOption) {
		if (this._private.data.length>this._private.mergeThreshold) {
			return [];
		}
		if ($.isNotDefined(leftMergeOption)&&$.isNotDefined(rightMergeOption)) {
			return [];
		}
		var retVal = [];
		var deficit = true;
		var leftSurplus = 0;
		var leftData;
		var rightSurplus = 0;
		var rightData;
		var leftPeer = this._private.leftPeer;
		var rightPeer = this._private.rightPeer;
		if ($.isDefined(leftMergeOption)) {
			leftData = leftMergeOption.getData();
			leftSurplus = leftMergeOption.getSurplus();
		}
		if ($.isDefined(rightMergeOption)) {
			rightData = rightMergeOption.getData();
			rightSurplus = rightMergeOption.getSurplus();
		}
		if (leftSurplus>rightSurplus) {
			var leftSurplusData = leftMergeOption.getRightSurplusData();
			this._private.data = leftSurplusData.concat(this._private.data);
			retVal[0] = -1
			retVal[1] = leftMergeOption;
			retVal[2] = this._private.data[0].key;
			retVal[3] = this;
		}
		else if (rightSurplus>leftSurplus) {
			var rightSurplusData = rightMergeOption.getLeftSurplusData();
			this._private.data = this._private.data.concat(rightSurplusData);
			retVal[0] = 1
			retVal[1] = this;
			retVal[2] = rightMergeOption.getData()[0].key;
			retVal[3] = rightMergeOption;
		}
		else {
			var mergedLeafNode;
			if ($.isNotDefined(leftData)) {
				mergedLeafNode = new com.anvesaka.bplus.BTreeLeafNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:this._private.data.concat(rightData)
				});		
				retVal[0] = 1;
				retVal[1] = mergedLeafNode.getData()[0].key
				retVal[2] = mergedLeafNode;
				if ($.isDefined(rightPeer)&&$.isDefined(rightPeer.getRightPeer())) {
					rightPeer.getRightPeer().setLeftPeer(mergedLeafNode);
					mergedLeafNode.setRightPeer(rightPeer.getRightPeer());
				}
				if ($.isDefined(leftPeer)) {
					leftPeer.setRightPeer(mergedLeafNode);
					mergedLeafNode.setLeftPeer(leftPeer);
				}
			} 
			else if ($.isNotDefined(rightData)) {
				mergedLeafNode = new com.anvesaka.bplus.BTreeLeafNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:leftData.concat(this._private.data)
				});				
				retVal[0] = -1;
				retVal[1] = mergedLeafNode.getData()[0].key
				retVal[2] = mergedLeafNode;
				if ($.isDefined(leftPeer)&&$.isDefined(leftPeer.getLeftPeer())) {
					leftPeer.getLeftPeer().setRightPeer(mergedLeafNode);
					mergedLeafNode.setLeftPeer(leftPeer.getLeftPeer());
				}
				if ($.isDefined(rightPeer)) {
					rightPeer.setLeftPeer(mergedLeafNode);
					mergedLeafNode.setRightPeer(rightPeer);
				}
			}
			else if (rightData.length<leftData.length) {
				mergedLeafNode = new com.anvesaka.bplus.BTreeLeafNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:this._private.data.concat(rightData)
				});				
				retVal[0] = 1;
				retVal[1] = mergedLeafNode.getData()[0].key
				retVal[2] = mergedLeafNode;
				if ($.isDefined(rightPeer)&&$.isDefined(rightPeer.getRightPeer())) {
					rightPeer.getRightPeer().setLeftPeer(mergedLeafNode);
					mergedLeafNode.setRightPeer(rightPeer.getRightPeer());
				}
				if ($.isDefined(leftPeer)) {
					leftPeer.setRightPeer(mergedLeafNode);
					mergedLeafNode.setLeftPeer(leftPeer);
				}
			}
			else {
				mergedLeafNode = new com.anvesaka.bplus.BTreeLeafNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:leftData.concat(this._private.data)
				});				
				retVal[0] = -1;
				retVal[1] = mergedLeafNode.getData()[0].key
				retVal[2] = mergedLeafNode;
				if ($.isDefined(leftPeer)&&$.isDefined(leftPeer.getLeftPeer())) {
					leftPeer.getLeftPeer().setRightPeer(mergedLeafNode);
					mergedLeafNode.setLeftPeer(leftPeer.getLeftPeer());
				}
				if ($.isDefined(rightPeer)) {
					rightPeer.setLeftPeer(mergedLeafNode);
					mergedLeafNode.setRightPeer(rightPeer);
				}
			}
		}
		return retVal;
	},
	find:function(key) {
		var index = this.findIndex(key);
		var element = this._private.data[index];
		if (index<this._private.data.length&&element.key===key) {
			return element.value;
		}
	},
	range:function(start, end) {
		var node = this;
		var range = [];
		while ($.isDefined(node)) {
			var startIndex = node.findIndex(start);
			var endIndex = node.findIndex(end);
			var nodeData = node.getData();
			if (startIndex<nodeData.length) {
				range = range.concat(nodeData.slice(startIndex, endIndex));
			}
			if (endIndex==nodeData.length) {
				node = node.getRightPeer();
			}
			else {
				break;
			}
		}
		return range;
	},
	toString:function(indent) {
		return indent+"["+this._private.data.map(function(element) {
			return element.key;
		}).toString()+"]";
	}
});

$.namespace("com.anvesaka.bplus").BTree = Class.extend({
	init:function(options) {
		options = $.extend(true, {
			order:100,
			mergeThreshold:40
		}, options);
		this._private = options;
		this._private.root = new com.anvesaka.bplus.BTreeLeafNode({
			order:this._private.order,
			mergeThreshold:this._private.mergeThreshold,
			data:[]
		});
	},
	toString:function() {
		return this._private.root.toString("");
	},
	insert:function(key, value) {
		var newNodes = this._private.root.insert(key, value);
		/*
		 * If a three element array is returned, it means the root has split into to, with roughly half of the children of the current root
		 * falling under each new node.  Construct a new root that has a single data element, where the left and right child pointers point to
		 * the new nodes respectively.  The new root is implicitly an internal node.
		 */
		if (newNodes.length==3) {
			this._private.root = new com.anvesaka.bplus.BTreeInternalNode({
				order:this._private.order,
				mergeThreshold:this._private.mergeThreshold,
				data:[{
					key:newNodes[1],
					left:newNodes[0],
					right:newNodes[2]
				}]
			});
		}
	},
	remove:function(key) {
		var newNodes = this._private.root.remove(key);
		if (newNodes.length==1) {
			this._private.root = newNodes[0];
		}
	},
	find:function(key) {
		return this._private.root.find(key);
	},
	range:function(start, end) {
		return this._private.root.range(start, end);
	}
});
