const findRoot = require('find-root')
    , path = require('path')
    , resolve = require('resolve')
    , get = require('lodash.get')

/**
 * Find the full path to 'source', given 'file' as a full reference path.
 *
 * resolveImport('./foo', '/Users/ben/bar.js') => '/Users/ben/foo.js'
 * @param  {string} source - the module to resolve; i.e './some-module'
 * @param  {string} file - the importing file's full path; i.e. '/usr/local/bin/file.js'
 * TODO: take options as a third param, with webpack config file name
 * @return {string?} the resolved path to source, undefined if not resolved, or null
 *                   if resolved to a non-FS resource (i.e. script tag at page load)
 */
exports.resolveImport = function resolveImport(source, file) {

  var webpackConfig
  try {
    var packageDir = findRoot(file)
    if (!packageDir) throw new Error('package not found above ' + file)

    webpackConfig = require(path.join(packageDir, 'webpack.config.js'))
  } catch (err) {
    webpackConfig = {}
  }

  // simple alias lookup
  var resolveAliases = get(webpackConfig, 'resolve.alias')
  if (resolveAliases && source in resolveAliases) {
    return resolveAliases[source]
  }

  // externals
  if (findExternal(source, webpackConfig.externals)) return null

  var paths = []

  // root as first alternate path
  var rootPath = get(webpackConfig, 'resolve.root')
  if (rootPath) paths.push(rootPath)

  // otherwise, resolve "normally"
  return resolve.sync(source, {
    basedir: path.dirname(file),

    // defined via http://webpack.github.io/docs/configuration.html#resolve-extensions
    extensions: get(webpackConfig, 'resolve.extensions')
      || ['', '.webpack.js', '.web.js', '.js'],

    // http://webpack.github.io/docs/configuration.html#resolve-modulesdirectories
    moduleDirectory: get(webpackConfig, 'resolve.modulesDirectories')
      || ['web_modules', 'node_modules'],

    paths,
  })
}

function findExternal(source, externals) {
  if (!externals) return false

  // string match
  if (typeof externals === 'string') return (source === externals)

  // array: recurse
  if (externals instanceof Array) {
    return externals.some(e => findExternal(source, e))
  }

  if (externals instanceof RegExp) {
    return externals.test(source)
  }

  if (typeof externals === 'function') {
    throw new Error('unable to handle function externals')
  }

  // else, vanilla object
  return Object.keys(externals).some(e => source === e)
}