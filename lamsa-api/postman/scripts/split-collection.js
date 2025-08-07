#!/usr/bin/env node

/**
 * Split the main Postman collection into smaller, more manageable collections
 */

const fs = require('fs');
const path = require('path');

// Read the main collection
const mainCollectionPath = path.join(__dirname, '../Lamsa-API.postman_collection.json');
const mainCollection = JSON.parse(fs.readFileSync(mainCollectionPath, 'utf8'));

// Create base structure for each sub-collection
function createSubCollection(name, description, items, auth = null) {
  const subCollection = {
    info: {
      _postman_id: `${mainCollection.info._postman_id}-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name: `Lamsa API - ${name}`,
      description: description,
      schema: mainCollection.info.schema,
      _exporter_id: mainCollection.info._exporter_id
    },
    item: items,
    variable: mainCollection.variable || []
  };

  // Add auth if specified
  if (auth !== null) {
    subCollection.auth = auth;
  }

  // Add events if they exist in the original
  if (mainCollection.event) {
    subCollection.event = mainCollection.event;
  }

  return subCollection;
}

// Find folders in the main collection
const authFolder = mainCollection.item.find(folder => folder.name === 'Auth & Setup');
const bookingFolder = mainCollection.item.find(folder => folder.name === 'Booking Management');
const providerFolder = mainCollection.item.find(folder => folder.name === 'Provider & Service Management');
const journeyFolder = mainCollection.item.find(folder => folder.name === 'Complete User Journeys');
const errorFolder = mainCollection.item.find(folder => folder.name === 'Error Handling & Edge Cases');

// Create Auth & Setup collection
if (authFolder) {
  const authCollection = createSubCollection(
    'Auth & Setup',
    'Authentication and setup requests for generating JWT tokens and test data. Run this collection first to prepare the environment for testing.',
    [authFolder],
    null // No auth needed for auth endpoints
  );
  
  fs.writeFileSync(
    path.join(__dirname, '../collections/auth/Auth-Setup.postman_collection.json'),
    JSON.stringify(authCollection, null, 2)
  );
  console.log('✅ Created Auth & Setup collection');
}

// Create Booking Management collection
if (bookingFolder) {
  const bookingCollection = createSubCollection(
    'Booking Management',
    'Core booking management endpoints for creating, retrieving, updating, and managing bookings.',
    [bookingFolder],
    mainCollection.auth // Use main collection auth
  );
  
  fs.writeFileSync(
    path.join(__dirname, '../collections/bookings/Booking-Management.postman_collection.json'),
    JSON.stringify(bookingCollection, null, 2)
  );
  console.log('✅ Created Booking Management collection');
}

// Create Provider & Service Management collection
if (providerFolder) {
  const providerCollection = createSubCollection(
    'Provider & Service Management',
    'Provider marketplace endpoints for searching providers, viewing services, and checking availability.',
    [providerFolder],
    mainCollection.auth
  );
  
  fs.writeFileSync(
    path.join(__dirname, '../collections/providers/Provider-Services.postman_collection.json'),
    JSON.stringify(providerCollection, null, 2)
  );
  console.log('✅ Created Provider & Service Management collection');
}

// Create User Journeys collection
if (journeyFolder) {
  const journeyCollection = createSubCollection(
    'User Journeys',
    'Complete end-to-end user journey workflows demonstrating real-world usage scenarios.',
    [journeyFolder],
    mainCollection.auth
  );
  
  fs.writeFileSync(
    path.join(__dirname, '../collections/journeys/User-Journeys.postman_collection.json'),
    JSON.stringify(journeyCollection, null, 2)
  );
  console.log('✅ Created User Journeys collection');
}

// Create Error Scenarios collection
if (errorFolder) {
  const errorCollection = createSubCollection(
    'Error Scenarios',
    'Comprehensive error handling and edge case testing scenarios.',
    [errorFolder],
    mainCollection.auth
  );
  
  fs.writeFileSync(
    path.join(__dirname, '../collections/testing/Error-Scenarios.postman_collection.json'),
    JSON.stringify(errorCollection, null, 2)
  );
  console.log('✅ Created Error Scenarios collection');
}

console.log('\n🎉 Collection splitting complete!');