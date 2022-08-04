
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { stylesheet } = info;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                info.rules = {};
            });
            managed_styles.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                started = true;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.49.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var Constant = {
    	ALL: 'all',
    	ACTIVE: 'active',
    	DONE: 'done'
    };

    /* src/components/TodoHeader.svelte generated by Svelte v3.49.0 */

    const file$4 = "src/components/TodoHeader.svelte";

    function create_fragment$4(ctx) {
    	let header;
    	let div;
    	let h1;
    	let t1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			header = element("header");
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "SVELTE TODO";
    			t1 = space();
    			input = element("input");
    			add_location(h1, file$4, 7, 2, 108);
    			attr_dev(input, "type", "text");
    			add_location(input, file$4, 8, 2, 131);
    			attr_dev(div, "class", "wrap");
    			add_location(div, file$4, 6, 1, 87);
    			add_location(header, file$4, 5, 0, 77);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, div);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, input);
    			set_input_value(input, /*todoValue*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[2]),
    					listen_dev(
    						input,
    						"keyup",
    						function () {
    							if (is_function(/*handleTodoInputKeyup*/ ctx[1])) /*handleTodoInputKeyup*/ ctx[1].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*todoValue*/ 1 && input.value !== /*todoValue*/ ctx[0]) {
    				set_input_value(input, /*todoValue*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TodoHeader', slots, []);
    	let { todoValue } = $$props;
    	let { handleTodoInputKeyup } = $$props;
    	const writable_props = ['todoValue', 'handleTodoInputKeyup'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TodoHeader> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		todoValue = this.value;
    		$$invalidate(0, todoValue);
    	}

    	$$self.$$set = $$props => {
    		if ('todoValue' in $$props) $$invalidate(0, todoValue = $$props.todoValue);
    		if ('handleTodoInputKeyup' in $$props) $$invalidate(1, handleTodoInputKeyup = $$props.handleTodoInputKeyup);
    	};

    	$$self.$capture_state = () => ({ todoValue, handleTodoInputKeyup });

    	$$self.$inject_state = $$props => {
    		if ('todoValue' in $$props) $$invalidate(0, todoValue = $$props.todoValue);
    		if ('handleTodoInputKeyup' in $$props) $$invalidate(1, handleTodoInputKeyup = $$props.handleTodoInputKeyup);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [todoValue, handleTodoInputKeyup, input_input_handler];
    }

    class TodoHeader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { todoValue: 0, handleTodoInputKeyup: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoHeader",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*todoValue*/ ctx[0] === undefined && !('todoValue' in props)) {
    			console.warn("<TodoHeader> was created without expected prop 'todoValue'");
    		}

    		if (/*handleTodoInputKeyup*/ ctx[1] === undefined && !('handleTodoInputKeyup' in props)) {
    			console.warn("<TodoHeader> was created without expected prop 'handleTodoInputKeyup'");
    		}
    	}

    	get todoValue() {
    		throw new Error("<TodoHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set todoValue(value) {
    		throw new Error("<TodoHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleTodoInputKeyup() {
    		throw new Error("<TodoHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleTodoInputKeyup(value) {
    		throw new Error("<TodoHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/TodoInfo.svelte generated by Svelte v3.49.0 */
    const file$3 = "src/components/TodoInfo.svelte";

    function create_fragment$3(ctx) {
    	let div1;
    	let span;
    	let t0;
    	let t1;
    	let t2;
    	let div0;
    	let button0;
    	let t4;
    	let button1;
    	let t6;
    	let button2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			span = element("span");
    			t0 = text("COUNT: ");
    			t1 = text(/*todoCount*/ ctx[0]);
    			t2 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "ALL";
    			t4 = space();
    			button1 = element("button");
    			button1.textContent = "ACTIVE";
    			t6 = space();
    			button2 = element("button");
    			button2.textContent = "DONE";
    			add_location(span, file$3, 9, 1, 157);
    			attr_dev(button0, "class", "btn");
    			toggle_class(button0, "selected", /*viewMode*/ ctx[1] === Constant.ALL);
    			add_location(button0, file$3, 11, 2, 199);
    			attr_dev(button1, "class", "btn");
    			toggle_class(button1, "selected", /*viewMode*/ ctx[1] === Constant.ACTIVE);
    			add_location(button1, file$3, 15, 2, 340);
    			attr_dev(button2, "class", "btn");
    			toggle_class(button2, "selected", /*viewMode*/ ctx[1] === Constant.DONE);
    			add_location(button2, file$3, 19, 2, 490);
    			add_location(div0, file$3, 10, 1, 191);
    			attr_dev(div1, "class", "info");
    			add_location(div1, file$3, 8, 0, 137);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t4);
    			append_dev(div0, button1);
    			append_dev(div0, t6);
    			append_dev(div0, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[3], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[4], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*todoCount*/ 1) set_data_dev(t1, /*todoCount*/ ctx[0]);

    			if (dirty & /*viewMode, Constant*/ 2) {
    				toggle_class(button0, "selected", /*viewMode*/ ctx[1] === Constant.ALL);
    			}

    			if (dirty & /*viewMode, Constant*/ 2) {
    				toggle_class(button1, "selected", /*viewMode*/ ctx[1] === Constant.ACTIVE);
    			}

    			if (dirty & /*viewMode, Constant*/ 2) {
    				toggle_class(button2, "selected", /*viewMode*/ ctx[1] === Constant.DONE);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TodoInfo', slots, []);
    	let { todoCount } = $$props;
    	let { viewMode } = $$props;
    	let { handleChangeViewMode } = $$props;
    	const writable_props = ['todoCount', 'viewMode', 'handleChangeViewMode'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TodoInfo> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => handleChangeViewMode(Constant.ALL);
    	const click_handler_1 = () => handleChangeViewMode(Constant.ACTIVE);
    	const click_handler_2 = () => handleChangeViewMode(Constant.DONE);

    	$$self.$$set = $$props => {
    		if ('todoCount' in $$props) $$invalidate(0, todoCount = $$props.todoCount);
    		if ('viewMode' in $$props) $$invalidate(1, viewMode = $$props.viewMode);
    		if ('handleChangeViewMode' in $$props) $$invalidate(2, handleChangeViewMode = $$props.handleChangeViewMode);
    	};

    	$$self.$capture_state = () => ({
    		Constant,
    		todoCount,
    		viewMode,
    		handleChangeViewMode
    	});

    	$$self.$inject_state = $$props => {
    		if ('todoCount' in $$props) $$invalidate(0, todoCount = $$props.todoCount);
    		if ('viewMode' in $$props) $$invalidate(1, viewMode = $$props.viewMode);
    		if ('handleChangeViewMode' in $$props) $$invalidate(2, handleChangeViewMode = $$props.handleChangeViewMode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		todoCount,
    		viewMode,
    		handleChangeViewMode,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class TodoInfo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			todoCount: 0,
    			viewMode: 1,
    			handleChangeViewMode: 2
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoInfo",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*todoCount*/ ctx[0] === undefined && !('todoCount' in props)) {
    			console.warn("<TodoInfo> was created without expected prop 'todoCount'");
    		}

    		if (/*viewMode*/ ctx[1] === undefined && !('viewMode' in props)) {
    			console.warn("<TodoInfo> was created without expected prop 'viewMode'");
    		}

    		if (/*handleChangeViewMode*/ ctx[2] === undefined && !('handleChangeViewMode' in props)) {
    			console.warn("<TodoInfo> was created without expected prop 'handleChangeViewMode'");
    		}
    	}

    	get todoCount() {
    		throw new Error("<TodoInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set todoCount(value) {
    		throw new Error("<TodoInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get viewMode() {
    		throw new Error("<TodoInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set viewMode(value) {
    		throw new Error("<TodoInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleChangeViewMode() {
    		throw new Error("<TodoInfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleChangeViewMode(value) {
    		throw new Error("<TodoInfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut } = {}) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => 'overflow: hidden;' +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    function flip(node, { from, to }, params = {}) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat);
        const dx = (from.left + from.width * ox / to.width) - (to.left + ox);
        const dy = (from.top + from.height * oy / to.height) - (to.top + oy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(Math.sqrt(dx * dx + dy * dy)) : duration,
            easing,
            css: (t, u) => {
                const x = u * dx;
                const y = u * dy;
                const sx = t + u * from.width / to.width;
                const sy = t + u * from.height / to.height;
                return `transform: ${transform} translate(${x}px, ${y}px) scale(${sx}, ${sy});`;
            }
        };
    }

    /* src/components/TodoItem.svelte generated by Svelte v3.49.0 */

    const file$2 = "src/components/TodoItem.svelte";

    // (24:0) {:else}
    function create_else_block(ctx) {
    	let span;
    	let t_value = /*todo*/ ctx[0].content + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text(t_value);
    			add_location(span, file$2, 24, 1, 516);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);

    			if (!mounted) {
    				dispose = listen_dev(span, "dblclick", /*dblclick_handler*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*todo*/ 1 && t_value !== (t_value = /*todo*/ ctx[0].content + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(24:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (17:0) {#if editMode === todo.id}
    function create_if_block(ctx) {
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			input = element("input");
    			attr_dev(input, "type", "text");
    			add_location(input, file$2, 17, 1, 349);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*todo*/ ctx[0].content);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[9]),
    					listen_dev(input, "focusout", /*focusout_handler*/ ctx[10], false, false, false),
    					listen_dev(input, "keyup", /*keyup_handler*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*todo*/ 1 && input.value !== /*todo*/ ctx[0].content) {
    				set_input_value(input, /*todo*/ ctx[0].content);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(17:0) {#if editMode === todo.id}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let input;
    	let t0;
    	let t1;
    	let a;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*editMode*/ ctx[3] === /*todo*/ ctx[0].id) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			input = element("input");
    			t0 = space();
    			if_block.c();
    			t1 = space();
    			a = element("a");
    			a.textContent = "X";
    			attr_dev(input, "type", "checkbox");
    			add_location(input, file$2, 11, 0, 225);
    			attr_dev(a, "href", "#null");
    			add_location(a, file$2, 26, 0, 600);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    			input.checked = /*todo*/ ctx[0].done;
    			insert_dev(target, t0, anchor);
    			if_block.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, a, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*input_change_handler*/ ctx[7]),
    					listen_dev(input, "click", /*click_handler*/ ctx[8], false, false, false),
    					listen_dev(a, "click", /*click_handler_1*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*todo*/ 1) {
    				input.checked = /*todo*/ ctx[0].done;
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(t1.parentNode, t1);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t0);
    			if_block.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(a);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TodoItem', slots, []);
    	let { todo } = $$props;
    	let { handleCheckTodo } = $$props;
    	let { handleRemoveTodo } = $$props;
    	let { editMode } = $$props;
    	let { handleEditTodoItem } = $$props;
    	let { handleEditTodoItemByEnter } = $$props;
    	let { handleChangeEditMode } = $$props;

    	const writable_props = [
    		'todo',
    		'handleCheckTodo',
    		'handleRemoveTodo',
    		'editMode',
    		'handleEditTodoItem',
    		'handleEditTodoItemByEnter',
    		'handleChangeEditMode'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TodoItem> was created with unknown prop '${key}'`);
    	});

    	function input_change_handler() {
    		todo.done = this.checked;
    		$$invalidate(0, todo);
    	}

    	const click_handler = () => handleCheckTodo(todo.id);

    	function input_input_handler() {
    		todo.content = this.value;
    		$$invalidate(0, todo);
    	}

    	const focusout_handler = () => handleEditTodoItem(todo);
    	const keyup_handler = e => handleEditTodoItemByEnter(e, todo);
    	const dblclick_handler = () => handleChangeEditMode(todo.id);
    	const click_handler_1 = () => handleRemoveTodo(todo.id);

    	$$self.$$set = $$props => {
    		if ('todo' in $$props) $$invalidate(0, todo = $$props.todo);
    		if ('handleCheckTodo' in $$props) $$invalidate(1, handleCheckTodo = $$props.handleCheckTodo);
    		if ('handleRemoveTodo' in $$props) $$invalidate(2, handleRemoveTodo = $$props.handleRemoveTodo);
    		if ('editMode' in $$props) $$invalidate(3, editMode = $$props.editMode);
    		if ('handleEditTodoItem' in $$props) $$invalidate(4, handleEditTodoItem = $$props.handleEditTodoItem);
    		if ('handleEditTodoItemByEnter' in $$props) $$invalidate(5, handleEditTodoItemByEnter = $$props.handleEditTodoItemByEnter);
    		if ('handleChangeEditMode' in $$props) $$invalidate(6, handleChangeEditMode = $$props.handleChangeEditMode);
    	};

    	$$self.$capture_state = () => ({
    		todo,
    		handleCheckTodo,
    		handleRemoveTodo,
    		editMode,
    		handleEditTodoItem,
    		handleEditTodoItemByEnter,
    		handleChangeEditMode
    	});

    	$$self.$inject_state = $$props => {
    		if ('todo' in $$props) $$invalidate(0, todo = $$props.todo);
    		if ('handleCheckTodo' in $$props) $$invalidate(1, handleCheckTodo = $$props.handleCheckTodo);
    		if ('handleRemoveTodo' in $$props) $$invalidate(2, handleRemoveTodo = $$props.handleRemoveTodo);
    		if ('editMode' in $$props) $$invalidate(3, editMode = $$props.editMode);
    		if ('handleEditTodoItem' in $$props) $$invalidate(4, handleEditTodoItem = $$props.handleEditTodoItem);
    		if ('handleEditTodoItemByEnter' in $$props) $$invalidate(5, handleEditTodoItemByEnter = $$props.handleEditTodoItemByEnter);
    		if ('handleChangeEditMode' in $$props) $$invalidate(6, handleChangeEditMode = $$props.handleChangeEditMode);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		todo,
    		handleCheckTodo,
    		handleRemoveTodo,
    		editMode,
    		handleEditTodoItem,
    		handleEditTodoItemByEnter,
    		handleChangeEditMode,
    		input_change_handler,
    		click_handler,
    		input_input_handler,
    		focusout_handler,
    		keyup_handler,
    		dblclick_handler,
    		click_handler_1
    	];
    }

    class TodoItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			todo: 0,
    			handleCheckTodo: 1,
    			handleRemoveTodo: 2,
    			editMode: 3,
    			handleEditTodoItem: 4,
    			handleEditTodoItemByEnter: 5,
    			handleChangeEditMode: 6
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoItem",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*todo*/ ctx[0] === undefined && !('todo' in props)) {
    			console.warn("<TodoItem> was created without expected prop 'todo'");
    		}

    		if (/*handleCheckTodo*/ ctx[1] === undefined && !('handleCheckTodo' in props)) {
    			console.warn("<TodoItem> was created without expected prop 'handleCheckTodo'");
    		}

    		if (/*handleRemoveTodo*/ ctx[2] === undefined && !('handleRemoveTodo' in props)) {
    			console.warn("<TodoItem> was created without expected prop 'handleRemoveTodo'");
    		}

    		if (/*editMode*/ ctx[3] === undefined && !('editMode' in props)) {
    			console.warn("<TodoItem> was created without expected prop 'editMode'");
    		}

    		if (/*handleEditTodoItem*/ ctx[4] === undefined && !('handleEditTodoItem' in props)) {
    			console.warn("<TodoItem> was created without expected prop 'handleEditTodoItem'");
    		}

    		if (/*handleEditTodoItemByEnter*/ ctx[5] === undefined && !('handleEditTodoItemByEnter' in props)) {
    			console.warn("<TodoItem> was created without expected prop 'handleEditTodoItemByEnter'");
    		}

    		if (/*handleChangeEditMode*/ ctx[6] === undefined && !('handleChangeEditMode' in props)) {
    			console.warn("<TodoItem> was created without expected prop 'handleChangeEditMode'");
    		}
    	}

    	get todo() {
    		throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set todo(value) {
    		throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleCheckTodo() {
    		throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleCheckTodo(value) {
    		throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleRemoveTodo() {
    		throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleRemoveTodo(value) {
    		throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get editMode() {
    		throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set editMode(value) {
    		throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleEditTodoItem() {
    		throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleEditTodoItem(value) {
    		throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleEditTodoItemByEnter() {
    		throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleEditTodoItemByEnter(value) {
    		throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleChangeEditMode() {
    		throw new Error("<TodoItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleChangeEditMode(value) {
    		throw new Error("<TodoItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/TodoList.svelte generated by Svelte v3.49.0 */
    const file$1 = "src/components/TodoList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[10] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (21:2) {#each fetchTodos as todo, index(todo)}
    function create_each_block_1(key_1, ctx) {
    	let li;
    	let todoitem;
    	let t;
    	let li_intro;
    	let li_outro;
    	let rect;
    	let stop_animation = noop;
    	let current;

    	todoitem = new TodoItem({
    			props: {
    				todo: /*todo*/ ctx[8],
    				handleCheckTodo: /*handleCheckTodo*/ ctx[1],
    				handleRemoveTodo: /*handleRemoveTodo*/ ctx[2],
    				editMode: /*editMode*/ ctx[3],
    				handleEditTodoItem: /*handleEditTodoItem*/ ctx[4],
    				handleEditTodoItemByEnter: /*handleEditTodoItemByEnter*/ ctx[5],
    				handleChangeEditMode: /*handleChangeEditMode*/ ctx[6]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			li = element("li");
    			create_component(todoitem.$$.fragment);
    			t = space();
    			add_location(li, file$1, 21, 3, 455);
    			this.first = li;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(todoitem, li, null);
    			append_dev(li, t);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const todoitem_changes = {};
    			if (dirty & /*fetchTodos*/ 128) todoitem_changes.todo = /*todo*/ ctx[8];
    			if (dirty & /*handleCheckTodo*/ 2) todoitem_changes.handleCheckTodo = /*handleCheckTodo*/ ctx[1];
    			if (dirty & /*handleRemoveTodo*/ 4) todoitem_changes.handleRemoveTodo = /*handleRemoveTodo*/ ctx[2];
    			if (dirty & /*editMode*/ 8) todoitem_changes.editMode = /*editMode*/ ctx[3];
    			if (dirty & /*handleEditTodoItem*/ 16) todoitem_changes.handleEditTodoItem = /*handleEditTodoItem*/ ctx[4];
    			if (dirty & /*handleEditTodoItemByEnter*/ 32) todoitem_changes.handleEditTodoItemByEnter = /*handleEditTodoItemByEnter*/ ctx[5];
    			if (dirty & /*handleChangeEditMode*/ 64) todoitem_changes.handleChangeEditMode = /*handleChangeEditMode*/ ctx[6];
    			todoitem.$set(todoitem_changes);
    		},
    		r: function measure() {
    			rect = li.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(li);
    			stop_animation();
    			add_transform(li, rect);
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(li, rect, flip, { duration: 300 });
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todoitem.$$.fragment, local);

    			add_render_callback(() => {
    				if (li_outro) li_outro.end(1);
    				li_intro = create_in_transition(li, fade, {});
    				li_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todoitem.$$.fragment, local);
    			if (li_intro) li_intro.invalidate();
    			li_outro = create_out_transition(li, slide, { duration: 100 });
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(todoitem);
    			if (detaching && li_outro) li_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(21:2) {#each fetchTodos as todo, index(todo)}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {#each todos as todo, index(todo)}
    function create_each_block(key_1, ctx) {
    	let li;
    	let todoitem;
    	let t;
    	let current;

    	todoitem = new TodoItem({
    			props: {
    				todo: /*todo*/ ctx[8],
    				handleCheckTodo: /*handleCheckTodo*/ ctx[1],
    				handleRemoveTodo: /*handleRemoveTodo*/ ctx[2],
    				editMode: /*editMode*/ ctx[3],
    				handleEditTodoItem: /*handleEditTodoItem*/ ctx[4],
    				handleEditTodoItemByEnter: /*handleEditTodoItemByEnter*/ ctx[5],
    				handleChangeEditMode: /*handleChangeEditMode*/ ctx[6]
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			li = element("li");
    			create_component(todoitem.$$.fragment);
    			t = space();
    			add_location(li, file$1, 43, 3, 810);
    			this.first = li;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(todoitem, li, null);
    			append_dev(li, t);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const todoitem_changes = {};
    			if (dirty & /*todos*/ 1) todoitem_changes.todo = /*todo*/ ctx[8];
    			if (dirty & /*handleCheckTodo*/ 2) todoitem_changes.handleCheckTodo = /*handleCheckTodo*/ ctx[1];
    			if (dirty & /*handleRemoveTodo*/ 4) todoitem_changes.handleRemoveTodo = /*handleRemoveTodo*/ ctx[2];
    			if (dirty & /*editMode*/ 8) todoitem_changes.editMode = /*editMode*/ ctx[3];
    			if (dirty & /*handleEditTodoItem*/ 16) todoitem_changes.handleEditTodoItem = /*handleEditTodoItem*/ ctx[4];
    			if (dirty & /*handleEditTodoItemByEnter*/ 32) todoitem_changes.handleEditTodoItemByEnter = /*handleEditTodoItemByEnter*/ ctx[5];
    			if (dirty & /*handleChangeEditMode*/ 64) todoitem_changes.handleChangeEditMode = /*handleChangeEditMode*/ ctx[6];
    			todoitem.$set(todoitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todoitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todoitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(todoitem);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(43:2) {#each todos as todo, index(todo)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let ul0;
    	let each_blocks_1 = [];
    	let each0_lookup = new Map();
    	let t0;
    	let hr;
    	let t1;
    	let ul1;
    	let each_blocks = [];
    	let each1_lookup = new Map();
    	let current;
    	let each_value_1 = /*fetchTodos*/ ctx[7];
    	validate_each_argument(each_value_1);
    	const get_key = ctx => /*todo*/ ctx[8];
    	validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		let child_ctx = get_each_context_1(ctx, each_value_1, i);
    		let key = get_key(child_ctx);
    		each0_lookup.set(key, each_blocks_1[i] = create_each_block_1(key, child_ctx));
    	}

    	let each_value = /*todos*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key_1 = ctx => /*todo*/ ctx[8];
    	validate_each_keys(ctx, each_value, get_each_context, get_key_1);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key_1(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul0 = element("ul");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t0 = space();
    			hr = element("hr");
    			t1 = space();
    			ul1 = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(ul0, file$1, 19, 1, 405);
    			add_location(hr, file$1, 39, 1, 757);
    			add_location(ul1, file$1, 41, 1, 765);
    			attr_dev(div, "class", "main");
    			add_location(div, file$1, 18, 0, 385);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul0);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul0, null);
    			}

    			append_dev(div, t0);
    			append_dev(div, hr);
    			append_dev(div, t1);
    			append_dev(div, ul1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul1, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*fetchTodos, handleCheckTodo, handleRemoveTodo, editMode, handleEditTodoItem, handleEditTodoItemByEnter, handleChangeEditMode*/ 254) {
    				each_value_1 = /*fetchTodos*/ ctx[7];
    				validate_each_argument(each_value_1);
    				group_outros();
    				for (let i = 0; i < each_blocks_1.length; i += 1) each_blocks_1[i].r();
    				validate_each_keys(ctx, each_value_1, get_each_context_1, get_key);
    				each_blocks_1 = update_keyed_each(each_blocks_1, dirty, get_key, 1, ctx, each_value_1, each0_lookup, ul0, fix_and_outro_and_destroy_block, create_each_block_1, null, get_each_context_1);
    				for (let i = 0; i < each_blocks_1.length; i += 1) each_blocks_1[i].a();
    				check_outros();
    			}

    			if (dirty & /*todos, handleCheckTodo, handleRemoveTodo, editMode, handleEditTodoItem, handleEditTodoItemByEnter, handleChangeEditMode*/ 127) {
    				each_value = /*todos*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key_1);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key_1, 1, ctx, each_value, each1_lookup, ul1, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].d();
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TodoList', slots, []);
    	let { todos } = $$props;
    	let { handleCheckTodo } = $$props;
    	let { handleRemoveTodo } = $$props;
    	let { editMode } = $$props;
    	let { handleEditTodoItem } = $$props;
    	let { handleEditTodoItemByEnter } = $$props;
    	let { handleChangeEditMode } = $$props;
    	let { fetchTodos } = $$props;

    	const writable_props = [
    		'todos',
    		'handleCheckTodo',
    		'handleRemoveTodo',
    		'editMode',
    		'handleEditTodoItem',
    		'handleEditTodoItemByEnter',
    		'handleChangeEditMode',
    		'fetchTodos'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TodoList> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('todos' in $$props) $$invalidate(0, todos = $$props.todos);
    		if ('handleCheckTodo' in $$props) $$invalidate(1, handleCheckTodo = $$props.handleCheckTodo);
    		if ('handleRemoveTodo' in $$props) $$invalidate(2, handleRemoveTodo = $$props.handleRemoveTodo);
    		if ('editMode' in $$props) $$invalidate(3, editMode = $$props.editMode);
    		if ('handleEditTodoItem' in $$props) $$invalidate(4, handleEditTodoItem = $$props.handleEditTodoItem);
    		if ('handleEditTodoItemByEnter' in $$props) $$invalidate(5, handleEditTodoItemByEnter = $$props.handleEditTodoItemByEnter);
    		if ('handleChangeEditMode' in $$props) $$invalidate(6, handleChangeEditMode = $$props.handleChangeEditMode);
    		if ('fetchTodos' in $$props) $$invalidate(7, fetchTodos = $$props.fetchTodos);
    	};

    	$$self.$capture_state = () => ({
    		fade,
    		slide,
    		flip,
    		TodoItem,
    		todos,
    		handleCheckTodo,
    		handleRemoveTodo,
    		editMode,
    		handleEditTodoItem,
    		handleEditTodoItemByEnter,
    		handleChangeEditMode,
    		fetchTodos
    	});

    	$$self.$inject_state = $$props => {
    		if ('todos' in $$props) $$invalidate(0, todos = $$props.todos);
    		if ('handleCheckTodo' in $$props) $$invalidate(1, handleCheckTodo = $$props.handleCheckTodo);
    		if ('handleRemoveTodo' in $$props) $$invalidate(2, handleRemoveTodo = $$props.handleRemoveTodo);
    		if ('editMode' in $$props) $$invalidate(3, editMode = $$props.editMode);
    		if ('handleEditTodoItem' in $$props) $$invalidate(4, handleEditTodoItem = $$props.handleEditTodoItem);
    		if ('handleEditTodoItemByEnter' in $$props) $$invalidate(5, handleEditTodoItemByEnter = $$props.handleEditTodoItemByEnter);
    		if ('handleChangeEditMode' in $$props) $$invalidate(6, handleChangeEditMode = $$props.handleChangeEditMode);
    		if ('fetchTodos' in $$props) $$invalidate(7, fetchTodos = $$props.fetchTodos);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		todos,
    		handleCheckTodo,
    		handleRemoveTodo,
    		editMode,
    		handleEditTodoItem,
    		handleEditTodoItemByEnter,
    		handleChangeEditMode,
    		fetchTodos
    	];
    }

    class TodoList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {
    			todos: 0,
    			handleCheckTodo: 1,
    			handleRemoveTodo: 2,
    			editMode: 3,
    			handleEditTodoItem: 4,
    			handleEditTodoItemByEnter: 5,
    			handleChangeEditMode: 6,
    			fetchTodos: 7
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TodoList",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*todos*/ ctx[0] === undefined && !('todos' in props)) {
    			console.warn("<TodoList> was created without expected prop 'todos'");
    		}

    		if (/*handleCheckTodo*/ ctx[1] === undefined && !('handleCheckTodo' in props)) {
    			console.warn("<TodoList> was created without expected prop 'handleCheckTodo'");
    		}

    		if (/*handleRemoveTodo*/ ctx[2] === undefined && !('handleRemoveTodo' in props)) {
    			console.warn("<TodoList> was created without expected prop 'handleRemoveTodo'");
    		}

    		if (/*editMode*/ ctx[3] === undefined && !('editMode' in props)) {
    			console.warn("<TodoList> was created without expected prop 'editMode'");
    		}

    		if (/*handleEditTodoItem*/ ctx[4] === undefined && !('handleEditTodoItem' in props)) {
    			console.warn("<TodoList> was created without expected prop 'handleEditTodoItem'");
    		}

    		if (/*handleEditTodoItemByEnter*/ ctx[5] === undefined && !('handleEditTodoItemByEnter' in props)) {
    			console.warn("<TodoList> was created without expected prop 'handleEditTodoItemByEnter'");
    		}

    		if (/*handleChangeEditMode*/ ctx[6] === undefined && !('handleChangeEditMode' in props)) {
    			console.warn("<TodoList> was created without expected prop 'handleChangeEditMode'");
    		}

    		if (/*fetchTodos*/ ctx[7] === undefined && !('fetchTodos' in props)) {
    			console.warn("<TodoList> was created without expected prop 'fetchTodos'");
    		}
    	}

    	get todos() {
    		throw new Error("<TodoList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set todos(value) {
    		throw new Error("<TodoList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleCheckTodo() {
    		throw new Error("<TodoList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleCheckTodo(value) {
    		throw new Error("<TodoList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleRemoveTodo() {
    		throw new Error("<TodoList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleRemoveTodo(value) {
    		throw new Error("<TodoList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get editMode() {
    		throw new Error("<TodoList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set editMode(value) {
    		throw new Error("<TodoList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleEditTodoItem() {
    		throw new Error("<TodoList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleEditTodoItem(value) {
    		throw new Error("<TodoList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleEditTodoItemByEnter() {
    		throw new Error("<TodoList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleEditTodoItemByEnter(value) {
    		throw new Error("<TodoList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get handleChangeEditMode() {
    		throw new Error("<TodoList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set handleChangeEditMode(value) {
    		throw new Error("<TodoList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fetchTodos() {
    		throw new Error("<TodoList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fetchTodos(value) {
    		throw new Error("<TodoList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // Unique ID creation requires a high quality random # generator. In the browser we therefore
    // require the crypto API and do not support built-in fallback to lower quality random number
    // generators (like Math.random()).
    var getRandomValues;
    var rnds8 = new Uint8Array(16);
    function rng() {
      // lazy load so that environments that need to polyfill have a chance to do so
      if (!getRandomValues) {
        // getRandomValues needs to be invoked in a context where "this" is a Crypto implementation. Also,
        // find the complete implementation of crypto (msCrypto) on IE11.
        getRandomValues = typeof crypto !== 'undefined' && crypto.getRandomValues && crypto.getRandomValues.bind(crypto) || typeof msCrypto !== 'undefined' && typeof msCrypto.getRandomValues === 'function' && msCrypto.getRandomValues.bind(msCrypto);

        if (!getRandomValues) {
          throw new Error('crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported');
        }
      }

      return getRandomValues(rnds8);
    }

    var REGEX = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

    function validate(uuid) {
      return typeof uuid === 'string' && REGEX.test(uuid);
    }

    /**
     * Convert array of 16 byte values to UUID string format of the form:
     * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
     */

    var byteToHex = [];

    for (var i = 0; i < 256; ++i) {
      byteToHex.push((i + 0x100).toString(16).substr(1));
    }

    function stringify(arr) {
      var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
      // Note: Be careful editing this code!  It's been tuned for performance
      // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
      var uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
      // of the following:
      // - One or more input array values don't map to a hex octet (leading to
      // "undefined" in the uuid)
      // - Invalid input values for the RFC `version` or `variant` fields

      if (!validate(uuid)) {
        throw TypeError('Stringified UUID is invalid');
      }

      return uuid;
    }

    function v4(options, buf, offset) {
      options = options || {};
      var rnds = options.random || (options.rng || rng)(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

      rnds[6] = rnds[6] & 0x0f | 0x40;
      rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

      if (buf) {
        offset = offset || 0;

        for (var i = 0; i < 16; ++i) {
          buf[offset + i] = rnds[i];
        }

        return buf;
      }

      return stringify(rnds);
    }

    /* src/App.svelte generated by Svelte v3.49.0 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let div;
    	let todoheader;
    	let updating_todoValue;
    	let t0;
    	let todoinfo;
    	let t1;
    	let todolist;
    	let current;

    	function todoheader_todoValue_binding(value) {
    		/*todoheader_todoValue_binding*/ ctx[13](value);
    	}

    	let todoheader_props = {
    		handleTodoInputKeyup: /*handleTodoInputKeyup*/ ctx[7]
    	};

    	if (/*todoValue*/ ctx[3] !== void 0) {
    		todoheader_props.todoValue = /*todoValue*/ ctx[3];
    	}

    	todoheader = new TodoHeader({ props: todoheader_props, $$inline: true });
    	binding_callbacks.push(() => bind(todoheader, 'todoValue', todoheader_todoValue_binding));

    	todoinfo = new TodoInfo({
    			props: {
    				todoCount: /*todoCount*/ ctx[5],
    				viewMode: /*viewMode*/ ctx[1],
    				handleChangeViewMode: /*handleChangeViewMode*/ ctx[12]
    			},
    			$$inline: true
    		});

    	todolist = new TodoList({
    			props: {
    				todos: /*todos*/ ctx[0],
    				fetchTodos: /*fetchTodos*/ ctx[2],
    				handleCheckTodo: /*handleCheckTodo*/ ctx[6],
    				handleRemoveTodo: /*handleRemoveTodo*/ ctx[8],
    				editMode: /*editMode*/ ctx[4],
    				handleChangeEditMode: /*handleChangeEditMode*/ ctx[9],
    				handleEditTodoItem: /*handleEditTodoItem*/ ctx[10],
    				handleEditTodoItemByEnter: /*handleEditTodoItemByEnter*/ ctx[11]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(todoheader.$$.fragment);
    			t0 = space();
    			create_component(todoinfo.$$.fragment);
    			t1 = space();
    			create_component(todolist.$$.fragment);
    			attr_dev(div, "class", "app");
    			add_location(div, file, 111, 0, 1919);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(todoheader, div, null);
    			append_dev(div, t0);
    			mount_component(todoinfo, div, null);
    			append_dev(div, t1);
    			mount_component(todolist, div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const todoheader_changes = {};

    			if (!updating_todoValue && dirty & /*todoValue*/ 8) {
    				updating_todoValue = true;
    				todoheader_changes.todoValue = /*todoValue*/ ctx[3];
    				add_flush_callback(() => updating_todoValue = false);
    			}

    			todoheader.$set(todoheader_changes);
    			const todoinfo_changes = {};
    			if (dirty & /*todoCount*/ 32) todoinfo_changes.todoCount = /*todoCount*/ ctx[5];
    			if (dirty & /*viewMode*/ 2) todoinfo_changes.viewMode = /*viewMode*/ ctx[1];
    			todoinfo.$set(todoinfo_changes);
    			const todolist_changes = {};
    			if (dirty & /*todos*/ 1) todolist_changes.todos = /*todos*/ ctx[0];
    			if (dirty & /*fetchTodos*/ 4) todolist_changes.fetchTodos = /*fetchTodos*/ ctx[2];
    			if (dirty & /*editMode*/ 16) todolist_changes.editMode = /*editMode*/ ctx[4];
    			todolist.$set(todolist_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(todoheader.$$.fragment, local);
    			transition_in(todoinfo.$$.fragment, local);
    			transition_in(todolist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(todoheader.$$.fragment, local);
    			transition_out(todoinfo.$$.fragment, local);
    			transition_out(todolist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(todoheader);
    			destroy_component(todoinfo);
    			destroy_component(todolist);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let todoCount;
    	let fetchTodos;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	let todos = [
    		{
    			id: v4(),
    			content: '첫 번째 할일',
    			done: false
    		},
    		{
    			id: v4(),
    			content: '두 번째 할일',
    			done: false
    		},
    		{
    			id: v4(),
    			content: '세 번째 할일',
    			done: false
    		},
    		{
    			id: v4(),
    			content: '네 번째 할일',
    			done: false
    		}
    	];

    	let todoValue = '';
    	let editMode = '';
    	let viewMode = '';

    	function handleCheckTodo(id) {
    		$$invalidate(0, todos = todos.map(todo => {
    			if (todo.id === id) {
    				todo.done = !todo.done;
    			}

    			return todo;
    		}));
    	}

    	function addTodoItem() {
    		if (todoValue) {
    			const newTodo = {
    				id: v4(),
    				content: todoValue,
    				done: false
    			};

    			$$invalidate(0, todos = [...todos, newTodo]);
    			$$invalidate(3, todoValue = '');
    		}
    	}

    	function handleTodoInputKeyup(e) {
    		if (e.keyCode == 13) {
    			console.log('todoValue: ${e.target.value}');
    			addTodoItem();
    		}
    	}

    	function handleRemoveTodo(id) {
    		$$invalidate(0, todos = todos.filter(todo => todo.id != id));
    	}

    	function handleChangeEditMode(id) {
    		$$invalidate(4, editMode = id);
    	}

    	function closeEditMode() {
    		$$invalidate(4, editMode = '');
    	}

    	function handleEditTodoItem(editTodo) {
    		$$invalidate(0, todos = todos.map(todo => {
    			if (todo.id === editTodo.id) {
    				todo.content = editTodo.content;
    			}

    			return todo;
    		}));

    		closeEditMode();
    	}

    	function handleEditTodoItemByEnter(e, editTodo) {
    		if (e.keyCode === 13) {
    			handleEditTodoItem(editTodo);
    		}
    	}

    	function handleChangeViewMode(mode) {
    		$$invalidate(1, viewMode = mode);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function todoheader_todoValue_binding(value) {
    		todoValue = value;
    		$$invalidate(3, todoValue);
    	}

    	$$self.$capture_state = () => ({
    		Constant,
    		TodoHeader,
    		TodoInfo,
    		TodoList,
    		uuid: v4,
    		todos,
    		todoValue,
    		editMode,
    		viewMode,
    		handleCheckTodo,
    		addTodoItem,
    		handleTodoInputKeyup,
    		handleRemoveTodo,
    		handleChangeEditMode,
    		closeEditMode,
    		handleEditTodoItem,
    		handleEditTodoItemByEnter,
    		handleChangeViewMode,
    		fetchTodos,
    		todoCount
    	});

    	$$self.$inject_state = $$props => {
    		if ('todos' in $$props) $$invalidate(0, todos = $$props.todos);
    		if ('todoValue' in $$props) $$invalidate(3, todoValue = $$props.todoValue);
    		if ('editMode' in $$props) $$invalidate(4, editMode = $$props.editMode);
    		if ('viewMode' in $$props) $$invalidate(1, viewMode = $$props.viewMode);
    		if ('fetchTodos' in $$props) $$invalidate(2, fetchTodos = $$props.fetchTodos);
    		if ('todoCount' in $$props) $$invalidate(5, todoCount = $$props.todoCount);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*todos*/ 1) {
    			$$invalidate(2, fetchTodos = todos);
    		}

    		if ($$self.$$.dirty & /*viewMode, todos*/ 3) {
    			{
    				if (viewMode === Constant.ALL) $$invalidate(2, fetchTodos = todos);
    				if (viewMode === Constant.ACTIVE) $$invalidate(2, fetchTodos = todos.filter(todo => todo.done === false));
    				if (viewMode === Constant.DONE) $$invalidate(2, fetchTodos = todos.filter(todo => todo.done === true));
    			}
    		}

    		if ($$self.$$.dirty & /*fetchTodos*/ 4) {
    			$$invalidate(5, todoCount = fetchTodos.length);
    		}
    	};

    	return [
    		todos,
    		viewMode,
    		fetchTodos,
    		todoValue,
    		editMode,
    		todoCount,
    		handleCheckTodo,
    		handleTodoInputKeyup,
    		handleRemoveTodo,
    		handleChangeEditMode,
    		handleEditTodoItem,
    		handleEditTodoItemByEnter,
    		handleChangeViewMode,
    		todoheader_todoValue_binding
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
