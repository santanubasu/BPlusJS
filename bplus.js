com.anvesaka.common.namespace("com.anvesaka.bplus").BPlusTreeNode = Class.extend({
	init:function(options) {
		this._private = {};
		this._private.order = 100;
		this._private.mergeThreshold = 40;
		this._private.data = [];
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

com.anvesaka.common.namespace("com.anvesaka.bplus").BPlusTreeInternalNode = com.anvesaka.bplus.BPlusTreeNode.extend({
	init:function(options) {
		this._super();
		this._private.data = options.data;
		this._private.mergeThreshold = options.mergeThreshold;
		this._private.order = options.order;
		this._private.leftPeer = options.leftPeer;
		this._private.rightPeer = options.rightPeer;
	},
	findIndex:function(key) {
		var data = this._private.data
		var left = 0;
		var right = data.length-1;
		var mid = left+Math.floor((right-left)/2);
		var found = false;
		do {
			mid = left+Math.floor((right-left)/2);
			if (data[mid].key<key) {
				left = mid+1;
			}
			else if (data[mid].key>key) {
				right = mid;
			}
			else {
				found = true;
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
	insert:function(key, value, clobber) {
		var index = this.findIndex(key);
		var element = this._private.data[index];
		var child;
		var newNodes;
		if (element.key<=key) {
			child = element.right;
			newNodes = child.insert(key, value, clobber);
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
			newNodes = child.insert(key, value, clobber);
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
		return newNodes;
	},
	split:function() {
		if (this._private.data.length<this._private.order) {
			return [];
		}
		var splitIndex = Math.floor(this._private.data.length/2);
		var leftNode = new com.anvesaka.bplus.BPlusTreeInternalNode({
			data:this._private.data.slice(0, splitIndex),
			leftPeer:this._private.leftPeer,
			order:this._private.order,
			mergeThreshold:this._private.mergeThreshold,
		});
		var rightNode = new com.anvesaka.bplus.BPlusTreeInternalNode({
			data:this._private.data.slice(splitIndex+1, this._private.data.length),
			rightPeer:this._private.rightPeer,
			order:this._private.order,
			mergeThreshold:this._private.mergeThreshold,
		});
		leftNode.setRightPeer(rightNode);
		rightNode.setLeftPeer(leftNode);
		if (com.anvesaka.common.isDefined(this._private.leftPeer)) {
			this._private.leftPeer.setRightPeer(leftNode);
		}
		if (com.anvesaka.common.isDefined(this._private.rightPeer)) {
			this._private.rightPeer.setLeftPeer(rightNode);
		}
		return [leftNode, this._private.data[splitIndex].key, rightNode];
	},
	remove:function(key, leftMergeOption, rightMergeOption) {
		var index = this.findIndex(key);
		var element = this._private.data[index];
		var mergeIndex = -1;
		var child;
		var retval;
		if (element.key<=key) {
			child = element.right;
			retval = child.remove(key, element.left, index<this._private.data.length-1?child.getRightPeer():undefined);
			if (this._private.data.length==1&&retval.length==4) {
				return [retval[0], retval[3]];
			}
			if (retval.length>1) {
				if (retval[1]==1) {
					mergeIndex = index+1;
				}
				else {
					mergeIndex = index;
				}
			}
		}
		else {
			//com.anvesaka.common.log(com.anvesaka.common.LOG_INFO, "Remove descending left via key "+element.key);
			child = element.left;
			retval = child.remove(key, index>0?child.getLeftPeer():undefined, element.right);
			if (this._private.data.length==1&&retval.length==4) {
				return [retval[0], retval[3]];
			}
			if (retval.length>1) {
				if (retval[1]==1) {
					mergeIndex = index;
				}
				else {
					mergeIndex = index-1;
				}
			}
		}
		if (mergeIndex>=0) {
			var mergeElement = this._private.data[mergeIndex];
			if (retval.length==5) {
				mergeElement.key = retval[3];
				return [retval[0]];
			}
			else {
				if (mergeIndex>0) {
					this._private.data[mergeIndex-1].right = retval[3];
				}
				if (mergeIndex<this._private.data.length-1) {
					this._private.data[mergeIndex+1].left = retval[3];
				}
				this._private.data.splice(mergeIndex, 1);
				return [retval[0]].concat(this.merge(leftMergeOption, rightMergeOption));
			}
		}
		else {
			return [retval[0]];
		}
	},
	merge:function(leftMergeOption, rightMergeOption) {
		if (this._private.data.length>this._private.mergeThreshold) {
			return [];
		}
		if (com.anvesaka.common.isNotDefined(leftMergeOption)&&com.anvesaka.common.isNotDefined(rightMergeOption)) {
			return [];
		}
		var retval = [];
		var deficit = true;
		var leftSurplus = 0;
		var leftData;
		var rightSurplus = 0;
		var rightData;
		var leftPeer = this._private.leftPeer;
		var rightPeer = this._private.rightPeer;
		if (com.anvesaka.common.isDefined(leftMergeOption)) {
			leftData = leftMergeOption.getData();
			leftSurplus = leftMergeOption.getSurplus();
		}
		if (com.anvesaka.common.isDefined(rightMergeOption)) {
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
			retval[0] = -1
			retval[1] = leftMergeOption;
			retval[2] = leftSurplusData[0].key;
			retval[3] = this;
		}
		else if (rightSurplus>leftSurplus) {
			var rightSurplusData = rightMergeOption.getLeftSurplusData();
			this._private.data = this._private.data.concat([{
				key:rightSurplusData[0].left.getData()[0].key,
				left:this._private.data[this._private.data.length-1].right,
				right:rightSurplusData[0].left
			}], rightSurplusData.slice(0, rightSurplusData.length-1));
			retval[0] = 1
			retval[1] = this;
			retval[2] = rightSurplusData[rightSurplusData.length-1].key;
			retval[3] = rightMergeOption;
		}
		else {
			var mergedInternalNode;
			if (com.anvesaka.common.isNotDefined(leftData)) {
				mergedInternalNode = new com.anvesaka.bplus.BPlusTreeInternalNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:this._private.data.concat([{
						key:rightData[0].left.getData()[0].key,
						left:this._private.data[this._private.data.length-1].right,
						right:rightData[0].left
					}], rightData)
				});		
				retval[0] = 1;
				retval[1] = mergedInternalNode.getData()[0].key
				retval[2] = mergedInternalNode;
				if (com.anvesaka.common.isDefined(rightPeer)&&com.anvesaka.common.isDefined(rightPeer.getRightPeer())) {
					rightPeer.getRightPeer().setLeftPeer(mergedInternalNode);
					mergedInternalNode.setRightPeer(rightPeer.getRightPeer());
				}
				if (com.anvesaka.common.isDefined(leftPeer)) {
					leftPeer.setRightPeer(mergedInternalNode);
					mergedInternalNode.setLeftPeer(leftPeer);
				}
			} 
			else if (com.anvesaka.common.isNotDefined(rightData)) {
				mergedInternalNode = new com.anvesaka.bplus.BPlusTreeInternalNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:leftData.concat([{
						key:this._private.data[0].left.getData()[0].key,
						left:leftData[leftData.length-1].right,
						right:this._private.data[0].left
					}], this._private.data)
				});				
				retval[0] = -1;
				retval[1] = mergedInternalNode.getData()[0].key
				retval[2] = mergedInternalNode;
				if (com.anvesaka.common.isDefined(leftPeer)&&com.anvesaka.common.isDefined(leftPeer.getLeftPeer())) {
					leftPeer.getLeftPeer().setRightPeer(mergedInternalNode);
					mergedInternalNode.setLeftPeer(leftPeer.getLeftPeer());
				}
				if (com.anvesaka.common.isDefined(rightPeer)) {
					rightPeer.setLeftPeer(mergedInternalNode);
					mergedInternalNode.setRightPeer(rightPeer);
				}
			}
			else if (rightData.length<leftData.length) {
				mergedInternalNode = new com.anvesaka.bplus.BPlusTreeInternalNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:this._private.data.concat([{
						key:rightData[0].left.getData()[0].key,
						left:this._private.data[this._private.data.length-1].right,
						right:rightData[0].left
					}], rightData)
				});				
				retval[0] = 1;
				retval[1] = mergedInternalNode.getData()[0].key
				retval[2] = mergedInternalNode;
				if (com.anvesaka.common.isDefined(rightPeer)&&com.anvesaka.common.isDefined(rightPeer.getRightPeer())) {
					rightPeer.getRightPeer().setLeftPeer(mergedInternalNode);
					mergedInternalNode.setRightPeer(rightPeer.getRightPeer());
				}
				if (com.anvesaka.common.isDefined(leftPeer)) {
					leftPeer.setRightPeer(mergedInternalNode);
					mergedInternalNode.setLeftPeer(leftPeer);
				}
			}
			else {
				mergedInternalNode = new com.anvesaka.bplus.BPlusTreeInternalNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:leftData.concat([{
						key:this._private.data[0].left.getData()[0].key,
						left:leftData[leftData.length-1].right,
						right:this._private.data[0].left
					}], this._private.data)
				});				
				retval[0] = -1;
				retval[1] = mergedInternalNode.getData()[0].key
				retval[2] = mergedInternalNode;
				if (com.anvesaka.common.isDefined(leftPeer)&&com.anvesaka.common.isDefined(leftPeer.getLeftPeer())) {
					leftPeer.getLeftPeer().setRightPeer(mergedInternalNode);
					mergedInternalNode.setLeftPeer(leftPeer.getLeftPeer());
				}
				if (com.anvesaka.common.isDefined(rightPeer)) {
					rightPeer.setLeftPeer(mergedInternalNode);
					mergedInternalNode.setRightPeer(rightPeer);
				}
			}
		}
		return retval;
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

com.anvesaka.common.namespace("com.anvesaka.bplus").BPlusTreeLeafNode = com.anvesaka.bplus.BPlusTreeNode.extend({
	init:function(options) {
		this._super();
		this._private.data = options.data;
		this._private.mergeThreshold = options.mergeThreshold;
		this._private.order = options.order;
		this._private.leftPeer = options.leftPeer;
		this._private.rightPeer = options.rightPeer;
	},
	findIndex:function(key) {
		var data = this._private.data;
		if (data.length==0) {
			return 0;
		}
		var left = 0;
		var right = data.length;
		var mid = left+Math.floor((right-left)/2);
		var found = false;
		do {
			mid = left+Math.floor((right-left)/2);
			if (data[mid].key<key) {
				left = mid+1;
			}
			else if (data[mid].key>key) {
				right = mid;
			}
			else {
				found = true;
			}
		} while (left!==right&&!found);
		if (found) {
			return mid;
		}
		else {
			return left;
		}
	},
	insert:function(key, value, clobber) {
		var index = this.findIndex(key);
		var element = this._private.data[index];
		if (index==this._private.data.length) {
			this._private.data.push({
				key:key,
				value:value
			});
		}
		else if (element.key===key) {
			if (clobber) {
				element.value = value;
			}
			else {
				return [element.value];
			}
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
		var leftNode = new com.anvesaka.bplus.BPlusTreeLeafNode({
			data:this._private.data.slice(0, splitIndex),
			leftPeer:this._private.leftPeer,
			order:this._private.order,
			mergeThreshold:this._private.mergeThreshold,
		});
		var rightNode = new com.anvesaka.bplus.BPlusTreeLeafNode({
			data:this._private.data.slice(splitIndex, this._private.data.length),
			rightPeer:this._private.rightPeer,
			order:this._private.order,
			mergeThreshold:this._private.mergeThreshold,
		});
		leftNode.setRightPeer(rightNode);
		rightNode.setLeftPeer(leftNode);
		if (com.anvesaka.common.isDefined(this._private.leftPeer)) {
			this._private.leftPeer.setRightPeer(leftNode);
		}
		if (com.anvesaka.common.isDefined(this._private.rightPeer)) {
			this._private.rightPeer.setLeftPeer(rightNode);
		}
		return [leftNode, this._private.data[splitIndex].key, rightNode];
	},
	remove:function(key, leftMergeOption, rightMergeOption) {
		var index = this.findIndex(key);
		var element = this._private.data[index];
		if (index<this._private.data.length&&element.key===key) {
			this._private.data.splice(index, 1);
			return [element.value].concat(this.merge(leftMergeOption, rightMergeOption));
		}
		else {
			return [undefined];
		}
	},
	merge:function(leftMergeOption, rightMergeOption) {
		if (this._private.data.length>this._private.mergeThreshold) {
			return [];
		}
		if (com.anvesaka.common.isNotDefined(leftMergeOption)&&com.anvesaka.common.isNotDefined(rightMergeOption)) {
			return [];
		}
		var retval = [];
		var deficit = true;
		var leftSurplus = 0;
		var leftData;
		var rightSurplus = 0;
		var rightData;
		var leftPeer = this._private.leftPeer;
		var rightPeer = this._private.rightPeer;
		if (com.anvesaka.common.isDefined(leftMergeOption)) {
			leftData = leftMergeOption.getData();
			leftSurplus = leftMergeOption.getSurplus();
		}
		if (com.anvesaka.common.isDefined(rightMergeOption)) {
			rightData = rightMergeOption.getData();
			rightSurplus = rightMergeOption.getSurplus();
		}
		if (leftSurplus>rightSurplus) {
			var leftSurplusData = leftMergeOption.getRightSurplusData();
			this._private.data = leftSurplusData.concat(this._private.data);
			retval[0] = -1
			retval[1] = leftMergeOption;
			retval[2] = this._private.data[0].key;
			retval[3] = this;
		}
		else if (rightSurplus>leftSurplus) {
			var rightSurplusData = rightMergeOption.getLeftSurplusData();
			this._private.data = this._private.data.concat(rightSurplusData);
			retval[0] = 1
			retval[1] = this;
			retval[2] = rightMergeOption.getData()[0].key;
			retval[3] = rightMergeOption;
		}
		else {
			var mergedLeafNode;
			if (com.anvesaka.common.isNotDefined(leftData)) {
				mergedLeafNode = new com.anvesaka.bplus.BPlusTreeLeafNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:this._private.data.concat(rightData)
				});		
				retval[0] = 1;
				retval[1] = mergedLeafNode.getData()[0].key
				retval[2] = mergedLeafNode;
				if (com.anvesaka.common.isDefined(rightPeer)&&com.anvesaka.common.isDefined(rightPeer.getRightPeer())) {
					rightPeer.getRightPeer().setLeftPeer(mergedLeafNode);
					mergedLeafNode.setRightPeer(rightPeer.getRightPeer());
				}
				if (com.anvesaka.common.isDefined(leftPeer)) {
					leftPeer.setRightPeer(mergedLeafNode);
					mergedLeafNode.setLeftPeer(leftPeer);
				}
			} 
			else if (com.anvesaka.common.isNotDefined(rightData)) {
				mergedLeafNode = new com.anvesaka.bplus.BPlusTreeLeafNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:leftData.concat(this._private.data)
				});				
				retval[0] = -1;
				retval[1] = mergedLeafNode.getData()[0].key
				retval[2] = mergedLeafNode;
				if (com.anvesaka.common.isDefined(leftPeer)&&com.anvesaka.common.isDefined(leftPeer.getLeftPeer())) {
					leftPeer.getLeftPeer().setRightPeer(mergedLeafNode);
					mergedLeafNode.setLeftPeer(leftPeer.getLeftPeer());
				}
				if (com.anvesaka.common.isDefined(rightPeer)) {
					rightPeer.setLeftPeer(mergedLeafNode);
					mergedLeafNode.setRightPeer(rightPeer);
				}
			}
			else if (rightData.length<leftData.length) {
				mergedLeafNode = new com.anvesaka.bplus.BPlusTreeLeafNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:this._private.data.concat(rightData)
				});				
				retval[0] = 1;
				retval[1] = mergedLeafNode.getData()[0].key
				retval[2] = mergedLeafNode;
				if (com.anvesaka.common.isDefined(rightPeer)&&com.anvesaka.common.isDefined(rightPeer.getRightPeer())) {
					rightPeer.getRightPeer().setLeftPeer(mergedLeafNode);
					mergedLeafNode.setRightPeer(rightPeer.getRightPeer());
				}
				if (com.anvesaka.common.isDefined(leftPeer)) {
					leftPeer.setRightPeer(mergedLeafNode);
					mergedLeafNode.setLeftPeer(leftPeer);
				}
			}
			else {
				mergedLeafNode = new com.anvesaka.bplus.BPlusTreeLeafNode({
					order:this._private.order,
					mergeThreshold:this._private.mergeThreshold,
					data:leftData.concat(this._private.data)
				});				
				retval[0] = -1;
				retval[1] = mergedLeafNode.getData()[0].key
				retval[2] = mergedLeafNode;
				if (com.anvesaka.common.isDefined(leftPeer)&&com.anvesaka.common.isDefined(leftPeer.getLeftPeer())) {
					leftPeer.getLeftPeer().setRightPeer(mergedLeafNode);
					mergedLeafNode.setLeftPeer(leftPeer.getLeftPeer());
				}
				if (com.anvesaka.common.isDefined(rightPeer)) {
					rightPeer.setLeftPeer(mergedLeafNode);
					mergedLeafNode.setRightPeer(rightPeer);
				}
			}
		}
		return retval;
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
		while (com.anvesaka.common.isDefined(node)) {
			var startIndex = node.findIndex(start);
			var endIndex = node.findIndex(end);
			var nodeData = node.getData();
			if (startIndex<nodeData.length) {
				for (var i=startIndex; i<endIndex; i++) {
					range.push(nodeData[i]);
				}
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

com.anvesaka.common.namespace("com.anvesaka.bplus").BPlusTree = Class.extend({
	init:function(options) {
		options = com.anvesaka.common.extend(true, {
			order:100,
			mergeThreshold:40
		}, options);
		this._private = options;
		this._private.root = new com.anvesaka.bplus.BPlusTreeLeafNode({
			order:this._private.order,
			mergeThreshold:this._private.mergeThreshold,
			data:[]
		});
	},
	toString:function() {
		return this._private.root.toString("");
	},
	insert:function(key, value, clobber) {
		var newNodes = this._private.root.insert(key, value, clobber);
		if (newNodes.length==3) {
			this._private.root = new com.anvesaka.bplus.BPlusTreeInternalNode({
				order:this._private.order,
				mergeThreshold:this._private.mergeThreshold,
				data:[{
					key:newNodes[1],
					left:newNodes[0],
					right:newNodes[2]
				}]
			});
		}
		else if (newNodes.length==1) {
			return newNodes[0];
		}
		return value;
	},
	remove:function(key) {
		var retval = this._private.root.remove(key);
		if (retval.length==2) {
			this._private.root = retval[1];
		}
		return retval[0];
	},
	find:function(key) {
		return this._private.root.find(key);
	},
	range:function(start, end) {
		return this._private.root.range(start, end);
	}
});
