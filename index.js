const sf = require('jsforce')
const AWS = require('aws-sdk')
const request = require('request')
const s3 = new AWS.S3()
const striptags = require('striptags')
const moment = require('moment')
const { getCode } = require('country-list')
const axios = require('axios')
require('dotenv').config()

const sfLoginUrl = process.env.SF_LOGIN_URL
const sfUsername = process.env.SF_USERNAME
const sfPassword = process.env.SF_PASSWORD
const apiKey = process.env.API_KEY
const s3Bucket = process.env.S3_BUCKET
const freshenUrl = process.env.FRESHEN_URL
const taxonomiesUrl = process.env.TAXONOMIES_URL

const conn = new sf.Connection({ loginUrl: sfLoginUrl })

const faqQuery =
  'SELECT Id, ' +
  'Atom__c, ' +
  'FirstPublishedDate, ' +
  'LastPublishedDate, ' +
  'Public_URL__c, ' +
  'References__c, ' +
  'Summary, ' +
  'Title, ' +
  'UrlName, ' +
  '(SELECT Id, DataCategoryName, DataCategoryGroupName FROM DataCategorySelections) ' +
  'FROM FAQ__kav ' +
  'WHERE PublishStatus = \'Online\' ' +
  'AND Language = \'en_US\' ' +
  'AND IsLatestVersion=true ' +
  'AND IsVisibleInPkb=true '

// For development/testing purposes
exports.handler = function (event, context) {
  conn.login(sfUsername, sfPassword, async function (err, res) {
    if (err) { return console.error(err) }
    console.log('Logged into Salesforce successfully!')
    let taxonomies = await getTaxonomies()
    getFaqs(taxonomies)
  })
}

const getTaxonomies = async () => {
  let taxonomyResults = await axios(taxonomiesUrl)
  return taxonomyResults.data
}

const getFaqs = (taxonomies) => {
  var translatedFaqs = []
  var query = conn.query(faqQuery)
    .on('record', function (record) {
      translatedFaqs.push(translate(record, taxonomies))
    })
    .on('end', async function () {
      console.log('total in database : ' + query.totalSize)
      console.log('total fetched : ' + query.totalFetched)
      writeToS3Bucket(await Promise.all(translatedFaqs))
    })
    .on('error', function (err) {
      console.error(err)
    })
    .run({ autoFetch: true })
}

const uniqueValues = (value, index, self) => {
  return self.indexOf(value) === index
}

const undefinedValues = (el) => {
  return el != null
}

const translate = (r, taxonomies) => {
  let dataCategories = {}
  let tradeRegions = []
  let worldRegions = []

  if (r.DataCategorySelections && r.DataCategorySelections.records) {
    r.DataCategorySelections.records.map(r => {
      const dataCategory = r.DataCategoryName.replace(/_/g, ' ')
      if (dataCategories[r.DataCategoryGroupName] === undefined) {
        dataCategories[r.DataCategoryGroupName] = [dataCategory]
      } else {
        dataCategories[r.DataCategoryGroupName].push(dataCategory)
      }
    })
  }

  if (dataCategories.Geographies !== undefined && dataCategories.Geographies.length > 0) {
    const taxonomiesByLabel = taxonomies.filter(taxonomy => dataCategories.Geographies.includes(taxonomy.label))
    if (taxonomiesByLabel !== undefined && taxonomiesByLabel.length > 0) {
      taxonomiesByLabel.map(taxonomy => {
        if (taxonomy.related_terms !== undefined) {
          if (taxonomy.related_terms.trade_regions !== undefined) {
            tradeRegions.push(...taxonomy.related_terms.trade_regions)
          }
          if (taxonomy.related_terms.world_regions !== undefined) {
            worldRegions.push(...taxonomy.related_terms.world_regions)
          }
        }
      })
    }
  }

  let faq = {
    faq_id: r.Id,
    question: r.Title,
    answer: striptags(r.Atom__c),
    url: striptags(r.Public_URL__c),
    first_published_date: moment(r.FirstPublishedDate, moment.ISO_8601).format('YYYY-MM-DD'),
    last_published_date: moment(r.LastPublishedDate, moment.ISO_8601).format('YYYY-MM-DD'),
    industries: dataCategories.Industries ? dataCategories.Industries.filter(uniqueValues) : [],
    topics: dataCategories.Trade_Topics ? dataCategories.Trade_Topics.filter(uniqueValues) : [],
    countries: dataCategories.Geographies
      ? dataCategories.Geographies.map(countryName => getCode(countryName)).filter(uniqueValues).filter(undefinedValues)
      : [],
    trade_regions: tradeRegions.filter(uniqueValues),
    world_regions: worldRegions.filter(uniqueValues)
  }

  return faq
}

const writeToS3Bucket = (data) => {
  const params = {
    Body: JSON.stringify(data, null, 2),
    Bucket: s3Bucket,
    Key: 'ita_faqs.json',
    ACL: 'public-read',
    ContentType: 'application/json'
  }
  s3.putObject(params, function (err, data) {
    if (err) { return console.error(err) }
    console.log('File uploaded successfully!')
    freshenEndpoint()
  })
}

const freshenEndpoint = () => {
  request(freshenUrl + apiKey, function (err, res, body) {
    if (err || (res && res.statusCode !== 200)) {
      return console.error(`An error occurred while freshening the endpoint. ${body}`)
    }
    console.log('Endpoint updated successfully!')
  })
}

exports.translate = translate
