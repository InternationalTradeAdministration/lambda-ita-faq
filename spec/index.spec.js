var chai = require('chai')
var index = require('../index')
var mockFaqs = require('./salesForceFaqResponse')
var mockTaxonomy = require('./taxonomyResponse')

describe('salesforce ita faq data translation', () => {
  it('translates Id to id', () => {
    const mockSalesForceFaq = mockFaqs.faqs.records[0]
    const result = index.translate(mockSalesForceFaq, mockTaxonomy.taxonomies)
    chai.expect(result.faq_id).to.eq('kaAt00000004DJyEAM')
  })

  it('translates title to question', () => {
    const mockSalesForceFaq = mockFaqs.faqs.records[0]
    const result = index.translate(mockSalesForceFaq, mockTaxonomy.taxonomies)
    chai.expect(result.question).to.eq('What are some tips on how to ship internationally?')
  })

  it('translates Atom__c to answer', () => {
    const mockSalesForceFaq = mockFaqs.faqs.records[0]
    const result = index.translate(mockSalesForceFaq, mockTaxonomy.taxonomies)
    chai.expect(result.answer).contains('Documentation for exporting a product varies by destination, existing preferential trade agreements (e.g. free trade agreement) and the product itself. Gain insight into how to best navigate the shipping process with our helpful shipping basics and export documentation videos and articles. Learn more about how to find product classification/HS codes and look up tariff rates, as well as advice on proper packing, labeling, and insurance requirements. ')
  })

  it('translates Public_URL__c to url', () => {
    const mockSalesForceFaq = mockFaqs.faqs.records[0]
    const result = index.translate(mockSalesForceFaq, mockTaxonomy.taxonomies)
    chai.expect(result.url).to.eq('http://www.export.gov/article?id=What-are-some-tips-on-how-to-ship-internationally')
  })

  it('translates FirstPublishedDate to first_published_date', () => {
    const mockSalesForceFaq = mockFaqs.faqs.records[0]
    const result = index.translate(mockSalesForceFaq, mockTaxonomy.taxonomies)
    chai.expect(result.first_published_date).to.eq('2018-02-14')
  })

  it('translates LastPublishedDate to last_published_date', () => {
    const mockSalesForceFaq = mockFaqs.faqs.records[0]
    const result = index.translate(mockSalesForceFaq, mockTaxonomy.taxonomies)
    chai.expect(result.last_published_date).to.eq('2018-02-27')
  })

  it('translates DataCategoryGroupName Industries to industries', () => {
    const mockSalesForceFaq = mockFaqs.faqs.records[1]
    const result = index.translate(mockSalesForceFaq, mockTaxonomy.taxonomies)
    chai.expect(result.industries[0]).to.eq('Export Management')
  })

  it('translates DataCategoryGroupName Trade_Topics to topics', () => {
    const mockSalesForceFaq = mockFaqs.faqs.records[1]
    const result = index.translate(mockSalesForceFaq, mockTaxonomy.taxonomies)
    chai.expect(result.topics[1]).to.eq('Foreign Trade Regulations')
  })

  it('translates DataCategoryGroupName Geographies to countries', () => {
    const mockSalesForceFaq = mockFaqs.faqs.records[1]
    const result = index.translate(mockSalesForceFaq, mockTaxonomy.taxonomies)
    chai.expect(result.countries[0]).to.eq('US')
    chai.expect(result.countries[1]).to.eq('AU')
  })

  it('uses Geographies to query related taxonomy terms', () => {
    const mockSalesForceFaq = mockFaqs.faqs.records[1]
    const result = index.translate(mockSalesForceFaq, mockTaxonomy.taxonomies)
    chai.expect(result.trade_regions).to.eql(
      [
        'Asia Pacific Economic Cooperation',
        'NAFTA',
        'Trans Pacific Partnership',
        'CAFTA-DR'
      ]
    )
    chai.expect(result.world_regions).to.eql(
      [
        'Western Hemisphere',
        'Pacific Rim',
        'North America',
        'Asia Pacific',
        'Oceania'
      ]
    )
  })

  it('Geographies that dont have a country code are ignored', () => {
    var mockSalesForceFaq = mockFaqs.faqs.records[0]
    var result = index.translate(mockSalesForceFaq, mockTaxonomy.taxonomies)
    chai.expect(result.trade_regions).to.eql([])
    chai.expect(result.world_regions).to.eql([])
  })
})
