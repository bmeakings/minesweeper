'use strict';

(angular
	.module(appName)
	.filter('counterDisplay', () => {
		return (input) => {
			return String(input).padStart(3, '0');
		};
	})
);
