REPORTER = spec

test:
    @NODE_ENV=test ./node_modules/.bin/mocha \
    --reporter $(REPORTER) \
    --globals app,settings \


test-w:
    @NODE_ENV=test ./node_modules/.bin/mocha \
    --reporter $(REPORTER) \
    --growl \
    --watch \
    --globals app,settings \


.PHONY: test test-w