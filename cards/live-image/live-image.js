
class LiveImage extends HTMLElement {

	_refreshCounter = 0;
	_refreshTime = 300; // Default 5m

	setConfig(config) {
		if (!this.img) {
			this.img = this._createImg();
			document.addEventListener("visibilitychange", e => {
				if (!document.hidden) {
					// Document is shown again. Make sure we have refreshed.
					const refreshDelta = Date.now() - this._refreshCounter;
					if (refreshDelta > this._refreshTime * 1000) {
						this.startRefresh();
						this.refresh();
					}
				}
			});
		}
		this.append(this.img);


		this.config = config;

		this.useTimestamp = !!this.config.useTimestamp;
		
		if (this.config.url) {
			this.img.src = this.useTimestamp ? this.addTimestampQuery(this.config.url) : this.config.url;
		}

		if (this.config.height) {
			this.style.height = config.height;
		}
		if (this.config.width) {
			this.style.width = config.width;
		}

		if (this.config.refresh) {
			this._refreshTime = Math.max(10, this.config.refresh); // Do not allow refresh < 10s
			if (isNaN(this._refreshTime)) {
				this._refreshTime = 60 * 5; // Default 5m
			}

		}
		this.startRefresh();
		this.refresh();
	}

	_createImg() {
		const img = document.createElement("img");
		img.style["max-width"] = "100%";
		img.style["max-height"] = "100%";
		return img;
	}

	addTimestampQuery(url) {
		const rTs = /([?&])ts=[^&]*/
		if (rTs.test(url)) {
			return url.replace(rTs, "$1ts=" + Date.now());
		} else {
			return url + "?ts=" + Date.now();
		}
	}

	startRefresh() {
		clearInterval(this._refreshInterval);
		setInterval(this.refresh.bind(this), this._refreshTime * 1000)
	}

	refresh() {
		this._refreshCounter = Date.now();
		if (this.useTimestamp) {
			this.img.src = this.addTimestampQuery(this.img.src);
		} else {
			// Firefox will contact the server and honor cache-control if the image-url has a changed hash
			// Chrome does not support refreshing images by adding different hashes to the src-property.
			if (navigator.userAgent.includes("Chrome/")) {
				// Weirdly, sending a HEAD-Request (which can even be prevented because of CORS-policy), 
				// leads to the image request being refreshed from the server.
				fetch(this.config.url, {
					method: "HEAD",
					cache: "default"
				}).catch(e => { /* ignore error */ });
			}
			this.img.src = this.config.url + "#" + this._refreshCounter;
		}
	}




	///// Graphic Configuration
	
	static getStubConfig() {
		return {
			url: "https://sirion.github.io/home-assistant/img/live-image.png",
			refresh: 300,
			useTimestamp: false
		}
	}

	static getConfigForm() {
		return {
			schema: [
				{ name: "url", required: true, selector: { text: {} } },
				{ name: "refresh", required: false, selector: { number: {} } },
				{ name: "useTimestamp", required: false, selector: { boolean: {} } },
			],
			computeLabel: (schema) => {
				switch (schema.name) {
					case "url":
						return "Image URL";
					case "refresh":
						return "Refresh in s";
					case "useTimestamp":
						return "Force Refresh";
				}
				return undefined;
			},
			computeHelper: (schema) => {
				switch (schema.name) {
					case "url":
						return "The URL of the image to be refreshed regularly";
					case "refresh":
						return "The number of seconds between refreshes";
					case "useTimestamp":
						return "Whether to add a timestamp to the query-part of the URL to force reload and thereby bypass caching mechanisms";
				}
				return undefined;
			},
			assertConfig: (config) => {
				// Validate
			},
		};
	}	

}
customElements.define("live-image", LiveImage);


window.customCards = window.customCards || [];
window.customCards.push({
	type: "live-image",
	name: "Live Image",
	preview: true, // Optional - defaults to false
	description: "Image that is refreshed automatically",
	documentationURL: "https://github.com/sirion/home-assistant/",
});