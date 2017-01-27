var s, o,
  calendar = {

    // ----------------------------
    // some default set of objects

    defaultObjects: {
      pickerBase: '<div class="vaccine-date-picker"><div class="logo-container"></div><h3 class="vaccine-name"></h3><p class="vaccine-spc"></p><p>Please select an administration date for the vaccine:</p><select class="vaccine-day-select"></select><select class="vaccine-month-select"></select><select class="vaccine-year-select"></select><hr><button data-action="picker-confirm">Confirm</button><button data-action="picker-cancel">Cancel</button><button data-action="picker-delete">Delete</button></div>',
      warningMsg: '',
      warningTitles: {
        overflowingPeriods:          'You have reached the suggested maximum vaccination schedule count.',
        warningDate:                 'The date you have chosen is not recommended.',
        occupiedMonth:               'Please select a new month.',
        deleteVaccine:               'Are you sure you want to delete this vaccine schedule?',
        safePeriodViolated:          'One or more vaccines has been scheduled in the safe period of this vaccine.',
        otherSafePeriodViolated:     'The date you selected is within one or more vaccines\' safe period.',
        incompatibleDiseaseViolated: 'The current vaccine cannot be administered within 2 weeks after any other vaccine.',
        warningComboExist:           'Vaccines for the following diseases should not be administered on the same date:',
        crashingDates:               'There is already a vaccine set up on this date.',
        embryosAttacked:             'Vaccines cannot be scheduled before the birth/calving date.',
        externalCrashingDates:       'This date already has other vaccines scheduled.',
        outOfCalendar:               'The new date you have chosen is in the past.',
        onBirthDate:                 'The new date should not overlap with the birth/calving date.',
        onBreedingDate:              'The new date should not overlap with the breeding date.',
        previousCycle:               'The vaccine you are editing belongs to the previous vaccination year.',
        pasteurellosisTip:           'You have selected Pasteurellosis:',
      }
    },

    // ----------------------------
    // initiate the calendar function

    init: function() {
      s = t.settings;
      o = this.defaultObjects;
      this.bindUIActions();
    },

    // ----------------------------
    // bind sub-functions to all possible UI actions here:

    bindUIActions: function() {

      // Initialise calendar layout
      $(document).ready(function() {

        // start initialisation
        calendar.UI.loadingStart();

        // checkers
        calendar.UI.loadingUpdate('Generating your customised Calendar...','Checking data validity...');
        calendar.initCheck.ifDatasetPresent();
        calendar.initCheck.yearValidity();

        // define temporal context
        calendar.UI.loadingUpdate('Generating your customised Calendar...','Setting up calendar base...');
        calendar.date.defineContext();

        // count common elements
        calendar.count();

        // run essential UI composers
        calendar.UI.loadingUpdate('Generating your customised Calendar...','Composing calendar structure...');
        calendar.UI.init();

        // generate javascript dates from PHP inputs
        calendar.UI.loadingUpdate('Generating your customised Calendar...','Converting vaccine dates...');
        calendar.date.allToJS();
        calendar.dataset.seasonDateToJS();

        // work on dataset values
        calendar.UI.loadingUpdate('Generating your customised Calendar...','Processing auto-populated vaccines...');
        calendar.dataset.updateInputPeriodsCount();
        calendar.dataset.removeOutterVaccines();
        // calendar.dataset.removeExtraCycle();
        calendar.dataset.updateInitialPeriodsCount();
        calendar.dataset.updateMaxPeriods();
        calendar.dataset.specialRules.init();
        // calendar.vaccine.arrange('all');

        // run init validators

        // create locators and datepickers
        calendar.UI.loadingUpdate('Generating your customised Calendar...','Populating the calendar...');
        calendar.vaccine.initVaccines();
        calendar.datePicker.generateOptions();

        // calendar.date.incrementedYear();

        // finish initialisation with a status change to 1
        calendar.UI.loadingFin();

        // outputs dataset at the end
        calendar.initCheck.test();

      });

      // refresh calendar layout on window resizing
      $(window).on('resize', function() {
        calendar.UI.sizer();
      });

      // clicking on vaccine label will bring up the date picker
      $('#calendar-container').on('click.locator', '.locator-label', function() {
        var target = $(this);
        calendar.datePicker.toggleDisplay(target);
      });

      $(document).on('change', '.vaccine-month-select', function() {
        var $parent = $(this).closest('.vaccine-date-picker');
        calendar.datePicker.generateDates($parent);
      });

      $(document).on('change', '.vaccine-year-select', function() {
        var $parent = $(this).closest('.vaccine-date-picker');
        calendar.datePicker.generateMonths($parent);
        calendar.datePicker.generateDates($parent);
      });

      // confirm new date picker value
      $('#calendar-container').on('click.pickerConfirm', '[data-action=picker-confirm]', function() {
        var target = $(this);
        calendar.datePicker.confirm(target);
      });

      $('#calendar-container').on('click.pickerDestroy', '[data-action=picker-delete]', function() {
        var target = $(this);
        // calendar.vaccine.destroy(target);
        calendar.notify.initDialog(null, 'deleteVaccine', null, null, target);
      });

      // cancel and reset date picker value
      // reset functionalities to be built
      $('#calendar-container').on('click.pickerCancel', '[data-action=picker-cancel]', function() {
        var target = $(this);
        calendar.datePicker.undo(target);
      });

      // clicking on empty disease-month cells will create a new vaccine period
      $('#calendar-container').on('click.addPeriodAt', '.cell-m', function() {
        var targetMonth = $(this);
        var isFull = calendar.vaccine.checkPeriodCount(targetMonth);
        calendar.vaccine.newPeriodAt(targetMonth, isFull);
      });

      $('#calendar-container').on('click.addPeriod', '[data-action="mobile-add-period"]', function(){
        var diseaseID = $(this).parents('.col-disease').attr('data-diseasecol-id');
        calendar.vaccine.newPeriod(diseaseID);
      });

      $('.generatePDF').on('click', function() {
        var storedHTML = $('#calendar-container').html();
        calendar.output.init();
        $('.back-to-edit-mode').on('click', function() {
          calendar.output.unpublish(storedHTML);
        });
      });

    },

    // ----------------------------
    // Initiation Checker Functions

    initCheck: {

      test: function() {
        console.log(s);
      },

      ifDatasetPresent: function() {
        if (s.enterprise === "") {
          s.initStatus = -2;
          $('.loading-indicator .loading-icon').html('<img src="../wp-content/plugins/vaccine-planner/plugin-pages/images/error.svg">');
          calendar.UI.loadingUpdate('It seems like step 1 has not been finished...','Please go back to <a href="../vaccination-page/">step 1</a> and restart the process.');
        }
      },

      yearValidity: function() {
        var a = s.birthDate.split('/')[2];
        var b = s.breedingDate.split('/')[2];
        if (a === '1970' || a === '-0001') {
          s.birthSeason = false;
          console.warn('birth date has come through as ' + a + '. This was probably because no birth season were selected in previous step. To allow the calendar to run the birthSeason has been set to false and turned off.');
        }
        if (b === '1970' || b === '-0001') {
          s.breedingSeason = false;
          console.warn('breeding date has come through as ' + b + '. This was probably because no breeding season were selected in previous step. To allow the calendar to run the breedingSeason has been set to false and turned off.');
        }
      },
    },

    count : function(mode) {
      if (mode === undefined) {
        mode = 'default';
      }
      s.count = {
        disease: s.diseases.length,
      };
      if (mode === 'default') {
        for (var i = 0; i < s.diseases.length; i ++) {
          s.diseaseIdList.push(s.diseases[i].diseaseId);
        }
        if (s.showNextYear === true) {
          s.monthCount = s.monthCount * 2;
        }
        // remove indices of previous months
        s.monthCount = s.monthCount - s.currentMonth + 1;
        s.positionIncrement = 100 / (s.monthCount + 1);
        // how many months, including the current month, are left in this year?
        s.currentYearRemainingMonths = 12 - parseInt(s.currentMonth) + 1;
      }
      if (mode === 'refresh') {
        // do nothing!
      }
    },

    // ----------------------------
    // Date Related Functions

    date: {

      defineContext: function() {
        // what's current year?
        s.initialYear = new Date().getFullYear();
        if (parseInt(s.initialYear) !== 2016) {
          // how many years is it for you who's ahead of us who's building the product at the moment?
          s.yearIncrement = s.initialYear - 2016;
          // update birthdate
          var oldBirthDate = s.birthDate.split('/');
          var newBirthDate = [];
          for (var i = 0; i < oldBirthDate.length; i ++) {
            if (i === 2) {
              newBirthDate.push((parseInt(oldBirthDate[i]) + 1));
            } else {
              newBirthDate.push(oldBirthDate[i]);
            }
          }
          s.birthDate = newBirthDate.toString().replace(/,/g, "/");
          // update breeding date:
          var oldBreedingDate = s.breedingDate.split('/');
          var newBreedingDate = [];
          for (var j = 0; j < oldBreedingDate.length; j ++) {
            if (j === 2) {
              newBreedingDate.push((parseInt(oldBreedingDate[j]) + 1));
            } else {
              newBreedingDate.push(oldBreedingDate[j]);
            }
          }
          s.breedingDate = newBreedingDate.toString().replace(/,/g, "/");

          // update all the vaccines
          for (var diseaseID = 0; diseaseID < s.diseases.length; diseaseID++) {
            for (var periodID = 0; periodID < s.diseases[diseaseID].periods.length; periodID++) {
              var originalDate = s.diseases[diseaseID].periods[periodID].date.split(',');
              // console.log('disease ' + diseaseID + ' period ' + periodID + ' originalDate: ' + originalDate[0]);
              var newYear = parseInt(originalDate[0]) + s.yearIncrement;
              // console.log('disease ' + diseaseID + ' period ' + periodID + ' newYear: ' + newYear);
              var newDate = [];
              newDate.push(newYear);
              newDate.push(originalDate[1]);
              newDate.push(originalDate[2]);
              s.diseases[diseaseID].periods[periodID].date = newDate.toString();
            }
          }
        }
      },

      allToJS: function() {
        // get php date from db and convert to js date (month - 1) and save to .d
        for (var diseaseID = 0; diseaseID < s.diseases.length; diseaseID++) {
          for (var periodID = 0; periodID < s.diseases[diseaseID].periods.length; periodID++) {
            var targetPeriod = s.diseases[diseaseID].periods[periodID];
            //  console.log('original date: ' + targetPeriod.date);
            var dateBlue = targetPeriod.date.split(',');
            var dateRare = dateBlue[0] + '-' + dateBlue[1] + '-' + dateBlue[2] + 'T00:00:00+00:00';
            /// what the hell... but we'll keep this seemingly redundant function since everything is working fine at the moment.
            //  console.log('date passing into js date: ' + dateRare);
            targetPeriod.d = new Date(dateRare);
            //  console.log('js date created: ' + targetPeriod.d);
          }
        }
      },

      toPHP: function(diseaseID, periodID, ny, nm, nd) {
        // update .date with php formatted date (normal human month!!)
        var targetPeriod = s.diseases[diseaseID].periods[periodID];
        targetPeriod.date = ny + ',' + nm + ',' + nd;
      },

      update: function(diseaseID, periodID, ny, nm, nd) {
        var targetPeriod = s.diseases[diseaseID].periods[periodID];
        targetPeriod.d.setFullYear(ny);
        targetPeriod.d.setMonth(nm - 1);
        targetPeriod.d.setDate(nd);
        var nmPHP = calendar.date.toDoubleDigit(nm);
        var ndPHP = calendar.date.toDoubleDigit(nd);
        calendar.date.toPHP(diseaseID, periodID, ny, nmPHP, ndPHP);
      },

      leapYear: function(year) {
        return ((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0);
      },

      toDoubleDigit: function(e) {
        if (e < 10) { e = 0 + e.toString(); }
        return e;
      },

      incrementYear: function(dateString,byNYears) {
        if (dateString === undefined) { dateString = new Date().toString(); }
        if (byNYears === undefined) { byNYears = 1; }
        var processing = dateString.split(/,|\//);
        var newYear = parseInt(processing[2]) + byNYears;
        var processed = [];
        for (var i = 0; i <= 2; i ++) {
          if ( i !== 2 ) {
            processed.push(processing[i]);
          } else if (i === 2) {
            processed.push(newYear);
          }
        }
        processed.join();
        return processed;
      },

      incrementedYear: function(e) {
        var input = '';
        if (e === 'birth') { input = s.birthDate;
        } else if (e === 'breeding') { input = s.breedingDate; }
        var output = calendar.date.incrementYear(input,1);
        return output;
      },

    },

    // ----------------------------
    // Dataset Related Functions

    dataset: {

      specialRules: {

        init: function() {
          var indicator = 0;
          var indexDecrease = 0;
          var index = 0;
          // disease specific rules
          for (var i = 0; i < s.diseases.length; i++) {
            // console.log(i + ',' + index + ',' + indexDecrease);
            // if (i < s.diseases.length) {
              // if (s.diseases[i] !== undefined) {
                if (s.diseases[index].initStatus === 0) {
                  if (s.diseases[index].diseaseId === 1) {
                    // #1 Leptospirosis
                    s.diseases[index].pairableDiseases = [2];
                  }
                  if (s.diseases[index].diseaseId === 2) {
                    // #2 BVD
                    s.diseases[index].pairableDiseases = [1,4];
                    if (s.animal === 'cows') {
                      for ( var j = 0; j < s.diseases.length; j++ ) {
                        if (s.diseases[j].diseaseId === 1 ||
                            s.diseases[j].diseaseId === 2 ||
                            s.diseases[j].diseaseId === 3 ) {
                          if (s.diseases[j].warningCombination === []) {
                            s.diseases[j].warningCombination = [1,2,4];
                          }
                        }
                      }
                    }
                  }
                  if (s.diseases[index].diseaseId === 3) {
                    // #3 Scour
                    $('#calendar-footnote').append('<p class="footnote-3"> * Calf scour caused by <em>E.coli</em>, Rotavirus, Coronavirus</p>');
                  }
                  if (s.diseases[index].diseaseId === 4) {
                    // #4 IBR
                    indicator = 1;
                    if (s.animal === 'calves') {
                      s.diseases[index].pairableDiseases = [5];
                      s.diseases[index].rules.birthRelativeRangeOut = [0,21];
                    }
                    if (s.animal === 'cows') {
                      s.diseases[index].pairableDiseases = [2,5];
                    }
                  }
                  if (s.diseases[index].diseaseId === 5) {
                    // #5 Pneumonia
                    indicator = 1;
                    if (s.animal === 'calves') {
                      s.diseases[index].pairableDiseases = [4];
                      s.diseases[index].rules.birthRelativeRangeOut = [0,21];
                      if (s.diseaseIdList.indexOf(4) < 0){
                        s.diseases[index].rules.birthRelativeRangeOut = [0,14];
                      }
                    }
                    if (s.animal === 'weanlings') {
                      s.diseases[index].maxPeriods = 24;
                    }
                    if (s.animal === 'cows') {
                      s.diseases[index].pairableDiseases = [4];
                      for ( var k = 0; k < s.diseases.length; k++ ) {
                        if (s.diseases[k].diseaseId === 2 ||
                            s.diseases[k].diseaseId === 4 ||
                            s.diseases[k].diseaseId === 5 ) {
                          s.diseases[k].warningCombination = [2,4,5]; // This will override #2's combo rule because pneumonia is the criteria here!
                        }
                      }
                    }
                    $('#calendar-footnote').append('<p class="footnote-5"> ** Pneumonia: Caused by RSV Pi3 or <em>Mannheimia haemolyticia</em></p>');
                  }
                  if (s.diseases[index].diseaseId === 6) {
                    // #6 Salmoellosis
                    indicator = 1;
                    if (s.animal === 'calves') {
                      s.diseases[index].rules.birthRelativeRangeOut = [0,21];
                    } else {
                      if (s.diseases[index].periods.length > 1) {
                        s.diseases[index].periods[1].isBooster = true;
                      }
                    }
                    // s.diseases[index].periods[1].customName = 'Bovivac S booster';
                  }
                  if (s.diseases[index].diseaseId === 7) {
                    // #7 Clostridial Disease (Tribovax® 10)
                    indicator = 1;
                    s.diseases[index].noVaccinePreBirth = true;
                    s.diseases[index].incompatibleDisease = true;
                    s.diseases[index].incompatiblePeriod = 14;
                    if (s.animal === 'calves' || s.animal === 'lamb') {
                      s.diseases[index].rules.birthRelativeRangeOut = [0,14];
                    } else {
                      // s.diseases[index].rules.vaccineRelativeRangeIn = [0,365];
                    }
                    if (s.animal === 'cows' ||
                        s.animal === 'replacementHeifers' ||
                        s.animal === 'ewes' ||
                        s.animal === 'hoggets') {
                      s.diseases[index].rules.birthRelativeRangeOut = null;
                      s.diseases[index].rules.birthRelativeRangeIn = [14,56];
                    }
                  }
                  if (s.diseases[index].diseaseId === 8) {
                    // #8 Lungworm
                    indicator = 1;
                    if (s.animal === 'calves') {
                      s.diseases[index].rules.birthRelativeRangeOut = [0,56];
                    }
                  }

                  if (s.diseases[index].diseaseId === 10) {
                    // #10 EAE
                    indicator = 1;
                    s.diseases[index].pairableDiseases = [11];
                  }

                  if (s.diseases[index].diseaseId === 11) {
                    // #11 Toxoplasmosis
                    indicator = 1;
                    s.diseases[index].pairableDiseases = [10];
                  }

                  if (s.diseases[index].diseaseId === 12) {
                    // #12 Orf
                    indicator = 1;
                    s.diseases[index].pairableDiseases = [12];
                    if (s.animal === 'ewes') {
                      s.diseases[index].rules.birthRelativeRangeOut = [0,49];
                      s.diseases[index].rules.vaccineRelativeRangeIn = [0,365];
                    }
                  }
                  if (s.diseases[index].diseaseId === 13) {
                    // #12 Footrot
                    indicator = 1;
                    if (s.animal === 'ewes') {
                      s.diseases[index].rules.birthRelativeRangeIn = [-28,28];
                      s.diseases[index].rules.vaccineRelativeRangeIn = [0,180];
                    }
                  }
                  if (s.diseases[index].diseaseId === 15) {
                    // #15 Pasteurellosis
                    indicator = 1;
                    s.diseases[index].pairableDiseases = [15];
                    $('#calendar-footnote').append('<p class="footnote-15">*** Caused by <em>Mannheimia haemolytica</em> or <em>Bibersteinia trehalosi</em></p>');
                    var comboFinder = false;
                    for (var t = 0; t < s.diseases.length; t ++) {
                      if (s.diseases[t].diseaseId === 16) {
                        comboFinder = true;
                        break;
                      }
                    }
                    if (comboFinder === false) {
                      var msgType = 'pasteurellosisTip',
                          msg = 'On farms where the incidence of pasteurellosis is high, a supplementary booster injection using Ovipast Plus may be required 2 – 3 weeks prior to expected seasonal outbreaks.';
                      calendar.notify.initDialog(null, msgType, msg, null, null);
                    }
                  }

                  // console.log(i + ',' + index + ',' + indexDecrease);

                  if (s.diseases[index].diseaseId === 16) {
                    // #16 P & C, vac: Heptavac® P Plus
                    indicator = 2;
                    s.diseases[index].initStatus = 1;
                    s.diseases[index].pairableDiseases = [16];
                    s.diseases[index].safePeriod = [14];
                    s.diseases[index].rules.vaccineRelativeRangeIn = [28,42];
                    if (s.animal === 'lamb') {
                      s.diseases[index].rules.birthRelativeRangeOut = [0,21];
                    }
                    if (s.animal === 'ewes' || s.animal === 'hoggets') {
                      s.diseases[index].rules.birthRelativeRangeIn = [28,42];
                    }
                    var m = s.diseases.length - 1;
                    $('#calendar-footnote .footnote-7').remove();
                    $('#calendar-footnote .footnote-15').remove();
                    $('#calendar-footnote').append('<p class="footnote-17">** A combination of Clostridial Disease and Pasteurellosis caused by <em>Mannheimia haemolytica</em> or <em>Bibersteinia trehalosi</em>.</p>');
                    while(m >= 0) {
                      // console.log('in loop remover 16 -' + m);
                      if (s.diseases[m].diseaseId === 7 ||
                          s.diseases[m].diseaseId === 15) {
                        console.info(s.diseases[m].name + ' has been deleted.');
                        indexDecrease = 1;
                        index -= indexDecrease;
                        s.diseases.splice(m,1);
                      }
                      m--;
                    }
                  }

                  if (s.diseases[index].diseaseId === 17) {
                    // #17 Respiratory Disease I
                    indicator = 2;
                    prevCycleCounter = 0;
                    currCycleCounter = 0;
                    for (var q = 0; q < s.diseases[index].periods.length; q++) {
                      if (s.diseases[index].periods[q].cycle === -1) {
                        prevCycleCounter += 1;
                      }
                      if (s.diseases[index].periods[q].cycle === 0) {
                        currCycleCounter += 1;
                      }
                    }
                    if (s.diseases[index].inputPeriodsCount === 9) {
                      for (var r = 0; r < s.diseases[index].periods.length; r++) {
                        if (s.diseases[index].periods[r].vacIndex === 1 ||
                            s.diseases[index].periods[r].vacIndex === 4 ||
                            s.diseases[index].periods[r].vacIndex === 7) {
                          s.diseases[index].periods[r].customName = 'Bovipast® RSP Booster';
                        }
                        if (s.diseases[index].periods[r].vacIndex === 2 ||
                            s.diseases[index].periods[r].vacIndex === 5 ||
                            s.diseases[index].periods[r].vacIndex === 8) {
                          s.diseases[index].periods[r].customName = 'Bovilis® IBR Marker Live IM';
                        }
                      }
                    }
                    if (s.diseases[index].inputPeriodsCount === 12) {
                      for (var o = 0; o < s.diseases[index].periods.length; o++) {
                        if (s.diseases[index].periods[o].vacIndex === 1 ||
                            s.diseases[index].periods[o].vacIndex === 5 ||
                            s.diseases[index].periods[o].vacIndex === 9) {
                          s.diseases[index].periods[o].customName = 'Bovipast® RSP Booster';
                        }
                        if (s.diseases[index].periods[o].vacIndex === 2 ||
                            s.diseases[index].periods[o].vacIndex === 6 ||
                            s.diseases[index].periods[o].vacIndex === 10) {
                          s.diseases[index].periods[o].customName = 'Bovilis® IBR Marker Live IM';
                        }
                        if (s.diseases[index].periods[o].vacIndex === 3 ||
                            s.diseases[index].periods[o].vacIndex === 7 ||
                            s.diseases[index].periods[o].vacIndex === 11) {
                          s.diseases[index].periods[o].customName = 'Bovipast® RSP & Bovilis® IBR Marker Live Boosters';
                        }
                      }
                    }
                    s.diseases[index].initStatus = 1;
                    $('#calendar-footnote .footnote-5').remove();
                    $('#calendar-footnote .footnote-7').remove();
                    $('#calendar-footnote').append('<p class="footnote-17">** A combination of IBR and Pneumonia caused by RSV Pi3 or <em>Mannheimia haemolyticia</em></p>');
                    var l = s.diseases.length - 1;
                    while(l >= 0) {
                      // console.log('in loop remover 17 - ' + l);
                      if (s.diseases[l].diseaseId === 4 || // remove IBR
                          s.diseases[l].diseaseId === 5) { // remove Pneumonia
                        console.info('disease #' + s.diseases[l].name + ' has been deleted.');
                        indexDecrease += 1;
                        index -= indexDecrease;
                        s.diseases.splice(l,1);
                      }
                      l--;
                    }
                  }

                  if (indicator === 1) {
                    console.info('#' + s.diseases[index].diseaseId + ' ' + s.diseases[index].name + " updated with special rules");
                    s.diseases[index].initStatus = 1;
                  }
                  if (indicator === 2) {
                    // console.info('#' + s.diseases[i - 1].diseaseId + ' ' + s.diseases[i - 1].name + " has caused it's related diseases to be removed");
                    calendar.count('refresh');
                    // run essential UI composers
                    calendar.UI.loadingUpdate('Generating your customised Calendar...','Refreshing calendar structure based on combination diseases...');
                    calendar.UI.init();
                  }

                }
              // }
            // }
            index ++;
            // reset indicator
            indicator = 0;
          }

          // update footnote asterisks

          for (var p = 0; p < s.diseases.length; p++) {
            if (s.diseases[p].diseaseId === 3) {
              $('[data-disease-id=' + s.diseases[p].diseaseId + '] .col-heading span').append('*');
            }
            if (s.diseases[p].diseaseId === 5) {
              $('[data-disease-id=' + s.diseases[p].diseaseId + '] .col-heading span').append('**');
            }
            if (s.diseases[p].diseaseId === 15) {
              $('[data-disease-id=' + s.diseases[p].diseaseId + '] .col-heading span').append('***');
            }
            if (s.diseases[p].diseaseId === 16) {
              $('[data-disease-id=' + s.diseases[p].diseaseId + '] .col-heading span').html('Pasteurellosis** & Clostridial Disease');
            }
            if (s.diseases[p].diseaseId === 17) {
              $('[data-disease-id=' + s.diseases[p].diseaseId + '] .col-heading span').append('**');
            }
          }

          // animal specific rules
          if (s.animal === 'calves' ||
              s.animal === 'weanlings' ||
              s.animal === 'lambs') {
            for ( var n = 0; n < s.diseases.length; n++ ) {
              s.diseases[n].noVaccinePreBirth = true;
            }
            console.info('the animal selected was ' + s.animal + '. all diseases have been flagged with noVaccinePreBirth.');
          }

        }

      },

      seasonDateToJS: function(){
        if (s.birthSeason === true) {
          var birthdayRaw = s.birthDate.split('/');
          var birthday = [];
          for (var key in birthdayRaw) {
            birthday.unshift(birthdayRaw[key]);
          }
          s.birthDateJS = new Date(birthday.toString());
        }
        if (s.breedingSeason === true) {
          var happydayRaw = s.breedingDate.split('/');
          var happyday = [];
          for (var k in happydayRaw) {
            happyday.unshift(happydayRaw[k]);
          }
          s.breedingDateJS = new Date(happyday.toString());
        }
      },

      removeOutterVaccines: function() {
        for (var diseaseID = 0; diseaseID < s.diseases.length; diseaseID++) {
          var i = s.diseases[diseaseID].periods.length;
          while (i--) {
            var inYear = s.diseases[diseaseID].periods[i].d.getFullYear();
            var inMonth = s.diseases[diseaseID].periods[i].d.getMonth();
            if (inYear < s.initialYear || inYear > (s.initialYear + 1)) {
              // if vaccine is on past year or two years ahead, remove it from dataset and log in console.
              s.diseases[diseaseID].periods.splice(i, 1);
              console.log('D[' + diseaseID + ']-V[' + i + '](' + inYear + '-' + (parseInt(inMonth) + 1) + ') removed.');
            } else if (inYear === s.initialYear){
              if (inMonth < (s.currentMonth - 1)) {
                s.diseases[diseaseID].periods.splice(i, 1);
                console.log('D[' + diseaseID + ']-V[' + i + '](' + inYear + '-' + (parseInt(inMonth) + 1) + ') removed.');
              }
            }
          }
          for (var periodID = 0; periodID < s.diseases[diseaseID].periods.length; periodID++) {
            if (s.diseases[diseaseID].periods[periodID].cycle === -1) {
              s.hasPrevCycle = true;
              break;
            }
          }
        }
      },

      removeExtraCycle: function() {
        //for (var diseaseID = 0; diseaseID < s.diseases.length; diseaseID++) {
        //  var i = s.diseases[diseaseID].periods.length;
        //  while (i--) {
        //    if (s.diseases[diseaseID].periods[i].cycle === 1) {
        //      s.diseases[diseaseID].periods.splice(i, 1);
        //      console.info('Disease[' + diseaseID + ']\'s vaccine [' + i + '] was outputted in the second cycle and for testing purposes it has been removed.');
        //    }
        //  }
        //}
      },

      updateInputPeriodsCount : function() {
        for (var diseaseID = 0; diseaseID < s.diseases.length; diseaseID++) {
          s.diseases[diseaseID].inputPeriodsCount = s.diseases[diseaseID].periods.length;
        }
      },
      updateInitialPeriodsCount : function() {
        for (var diseaseID = 0; diseaseID < s.diseases.length; diseaseID++) {
          s.diseases[diseaseID].initialPeriodsCount = s.diseases[diseaseID].periods.length;
        }
      },

      updateMaxPeriods: function () {
        for (var diseaseID = 0; diseaseID < s.diseases.length; diseaseID++) {
          s.diseases[diseaseID].maxPeriods = s.diseases[diseaseID].periods.length;
          var maxPeriodCount = s.diseases[diseaseID].maxPeriods;
          calendar.vaccine.toggleAddPeriod(diseaseID,maxPeriodCount);
        }
      },


    },

    // ----------------------------
    // Calendar UI Related Functions

    UI: {

      init: function() {
        calendar.UI.flush();
        calendar.UI.subtitle();
        calendar.UI.initCalendarSpace();
        calendar.UI.constructColMonths();
        calendar.UI.drawSeasonLines();
        calendar.disease.initDiseaseCols();
        calendar.UI.sizer();
        calendar.UI.activateUIWatchers();
        calendar.UI.updateEnterprise();
      },

      flush: function() {
        $('#calendar-composer').html('');
      },

      updateEnterprise: function() {
        var eName = s.enterprise.toLowerCase();
        var targetAttr = '[data-enterprise=' + eName + ']';
        $('.header-banner').find(targetAttr).css('opacity', '1').siblings().remove();
      },

      subtitle: function() {
        var animal = s.animal;
        var birthSeasonDisplayName = s.birthSeasonName;
        var breedingSeasonDisplayName = s.breedingSeasonName;
        if (animal === 'replacementHeifers') { animal = 'Replacement Heifers';}
        if (animal === 'cows') { s.birthSeasonTitle = 'Calving Season'; }
        if (animal === 'ewes') { s.birthSeasonTitle = 'Lambing Season'; }
        if (animal === 'ewes') { s.breedingSeasonTitle = 'Tupping Season'; }
        if (s.birthSeasonName === 'allYear') { birthSeasonDisplayName = 'All Year'; }
        if (s.breedingSeasonName === 'allYear') { breedingSeasonDisplayName = 'All Year';}
        var subtitleHTML = '<strong>Enterprise</strong>: ' + s.enterprise + '<br>';
        subtitleHTML += '<strong>Animal</strong>: ' + animal;
        if (s.birthSeason === true) {
          subtitleHTML += '<br><strong>' + birthSeasonDisplayName + ' ' + s.birthSeasonTitle + '</strong>: ' + s.birthDate.toLocaleString().split('00:00')[0] + '';
        }
        if (s.breedingSeason === true) {
          subtitleHTML += '<br><strong>' + breedingSeasonDisplayName + ' ' + s.breedingSeasonTitle + '</strong>: ' + s.breedingDate.toLocaleString().split('00:00')[0] + '';
        }
        $('.calendar-subtitle').html(subtitleHTML);
      },

      sizer: function() {
        // draw the table's HTML
        var calendarWidth = $('.col-bg').width();
        var colMonthWidth = $('.col-months').width();
        $('#diseases-wrapper').css('padding-left', colMonthWidth);
        // following is to prevent bad layout in old browsers
        var colDiseaseWidth = (calendarWidth - colMonthWidth) / s.count.disease - 0.5;
        $('.col-disease').css('width', colDiseaseWidth);
      },

      initCalendarSpace: function() {
        var colHTML = '<ol id="col-bg" class="col-bg">';
        colHTML += '<li class="col-heading"><span>&nbsp;</span></li></ol>';
        $('#calendar-composer').append(colHTML);
        for (var i = 0; i < s.monthCount; i++) {
          if (i === (12 - parseInt(s.currentMonth) + 1)) {
            $('#calendar-composer .col-bg').append('<li class="new-year">&nbsp;</li>');
          } else {
            $('#calendar-composer .col-bg').append('<li>&nbsp;</li>');
          }
        }
      },

      constructColMonths: function() {
        var colHTML = '<ul id="col-months" class="col-months">';
        colHTML += '<li class="col-heading"><span>' + s.initialYear + '</span></li></ul>';
        $('#calendar-composer').append(colHTML);
        for (var i = 0; i < s.monthCount; i++) {
          var monthAbbr = '';
          if (i < s.currentYearRemainingMonths) {
            monthAbbr = s.monthsAbbr[(parseInt(i) + parseInt(s.currentMonth) - 1)];
            $('#calendar-composer .col-months').append('<li>' + monthAbbr + '</li>');
          } else {
            if (i === (s.currentYearRemainingMonths)) {
              monthAbbr += s.monthsAbbr[i - s.currentYearRemainingMonths] + ' ' + (s.initialYear + 1);
              $('#calendar-composer .col-months').append('<li class="new-year">' + monthAbbr + '</li>');
            } else {
              monthAbbr = s.monthsAbbr[i - s.currentYearRemainingMonths];
              $('#calendar-composer .col-months').append('<li>' + monthAbbr + '</li>');
            }
          }
        }
      },

      compileSeasonLine: function(seasonType) {
        var seasonDate = '', seasonTitle = '', seasonDay = '', seasonMonth = '';
        if (seasonType === 'birth') {
          seasonDate = s.birthDate.toString().split('/20')[0];
          seasonTitle = s.birthSeasonTitle;
        } else if (seasonType === 'breeding') {
          seasonDate = s.breedingDate.toString().split('/20')[0];
          seasonTitle = s.breedingSeasonTitle;
        }
        seasonDay = seasonDate.split('/')[0];
        seasonMonth = seasonDate.split('/')[1];
        var linePosition = (seasonDate.split('/')[1] - s.currentMonth + 1) * s.positionIncrement;
        if (seasonMonth === '2') {
          linePosition += seasonDay / 28 * s.positionIncrement;
        } else {
          linePosition += seasonDay / 30 * s.positionIncrement;
        }
        var linePositionCollection = [linePosition + '%', linePosition + 12 * s.positionIncrement + '%'];
        var htmlBase = '';
        for (var key in linePositionCollection) {
          htmlBase += '<div class="season-marker" data-season-type=' + seasonType + ' style="top: ' + linePositionCollection[key] + '">';
          htmlBase += '<span class="season-tag">' + seasonTitle + ': ' + seasonDate + '</span></div>';
        }
        return htmlBase;
      },

      drawSeasonLines: function() {
        var html = '';
        if (s.birthSeason === true) {
          html = calendar.UI.compileSeasonLine('birth');
          $('#calendar-composer').append(html);
        }
        if (s.breedingSeason === true) {
          html = calendar.UI.compileSeasonLine('breeding');
          $('#calendar-composer').append(html);
        }
      },

      loadingStart: function() {
        setTimeout(function() {
          if (s.initStatus != -1) {
            $('.loading-indicator .loading-icon').html('<img src="../wp-content/plugins/vaccine-planner/plugin-pages/images/error.svg">');
            calendar.UI.loadingUpdate('Oops, some thing might have gone wrong..','Please <a href="../vaccination-page/">start from the beginning</a> or <a href="../contact/">report the issue</a> to us.<br>You can also try clearing your browser cache.</small>');
          }
        }, 5500);
      },

      loadingUpdate: function(title, message) {
        $('.loading-indicator .loading-message').html(title + '<br><small>' + message + '</small>');
      },

      loadingFin: function() {
        if (s.initStatus != -1) {
          setTimeout(function() {
            $('.loading-indicator').fadeOut(200);
            $('#calendar-composer').removeClass('initiating').removeClass('loading');
          }, 500);
          s.initStatus = 1;
          // console.clear();
          console.info('Calendar has been successfully loaded.');
          // calendar.notify.debugPrint('Calendar ready. Please edit the vaccines and come back for validation information.');
        } else {
          setTimeout(function() {
            $('.loading-indicator .loading-icon').html('<img src="../wp-content/plugins/vaccine-planner/plugin-pages/images/error.svg">');
            calendar.UI.loadingUpdate('An error has occurred.','We apologize for the inconvenience. <br>Please review your choices on <a href="../vaccination-page/">step 1</a> and try again.');
          }, 1200);
        }
      },

      activateUIWatchers: function() {
        calendar.UI.calendarScrollbarWatcher.initWatcher();
      },

      calendarScrollbarWatcher: {

        watcher: function() {
          var calendarWidth = $('.col-bg').width();
          var diseasesWrapperWidth = $('#diseases-wrapper').width();
          var widthDifference = diseasesWrapperWidth - calendarWidth;
          $(window).on('load resize', function() {
            calendarWidth = $('.col-bg').width();
            diseasesWrapperWidth = $('#diseases-wrapper').width();
            widthDifference = diseasesWrapperWidth - calendarWidth;
          });
          // console.log('watcher running:' + calendarWidth + ' ' + diseasesWrapperWidth);
          if (calendarWidth > diseasesWrapperWidth) {
            // console.log('watcher condition met');
            // console.log(calendarWidth + ' ' + diseasesWrapperWidth);
            $('#calendar-composer').addClass('scrollbar-displayed');
            $('#diseases-wrapper').on('scroll', function() {
              // console.log('diseases-wrapper-scrollllling');
              var scrollLeft = $(this).scrollLeft();
              // console.log(scrollLeft + '=?' + widthDifference);
              if (scrollLeft > 0) {
                $('#calendar-composer').addClass('is-midway-scroll');
                if (scrollLeft === widthDifference) {
                  $('#calendar-composer').addClass('is-end-scroll');
                } else {
                  $('#calendar-composer').removeClass('is-end-scroll');
                }
              } else {
                $('#calendar-composer').removeClass('is-midway-scroll');
              }
            });
          } else {
            $('#calendar-composer').removeClass('scrollbar-displayed');
            $('#diseases-wrapper').off('scroll');
          }
        },

        initWatcher: function() {
          calendar.UI.calendarScrollbarWatcher.watcher();
          $(window).on('load resize', function() {
            calendar.UI.calendarScrollbarWatcher.watcher();
          });
        },

      },

    },

    // ----------------------------
    // Disease Related Functions

    disease: {

      constructCol: function(diseaseID) {
        // construct a disease column
        var colHTML = '<ul id="col-disease-' + s.diseases[diseaseID].slug + '" ';
        colHTML += 'class="col-disease" ';
        colHTML += 'data-diseasecol-id="' + diseaseID + '" ';
        colHTML += 'data-disease-id="' + s.diseases[diseaseID].diseaseId + '">';
        colHTML += '<li class="col-heading"><span>' + s.diseases[diseaseID].name + '</span></li>';
        colHTML += '<button data-action="mobile-add-period">Add a new vaccine period</button></ul>';
        $('#diseases-wrapper').append(colHTML);
        var colSelector = '[data-diseasecol-id=' + diseaseID + ']';
        for (var i = 0; i < s.monthCount; i++) {
          $(colSelector).append('<li class="cell-m">&nbsp;</li>');
        }
      },

      initDiseaseCols: function() {
        $('#calendar-composer').append('<div id="diseases-wrapper"></div>');
        for (var i = 0; i < s.diseases.length; i++) {
          calendar.disease.constructCol(i);
        }
      }

    },

    // ----------------------------
    // Vaccine Related Functions

    vaccine: {

      // The colored labels for vaccines are wrapped in 'vaccine-locator's.
      // These locators are what users interact to modify the calendar
      // The locators *locates* (or relocates) its position on the calendar(changing months)

      constructLocator: function(periodID, diseaseID, isArranging) {
        // console.log(periodID + ' ' + diseaseID + ' ' + isArranging);
        // console.log('Constructing new period[' + periodID + '] for disease ' +  s.diseases[diseaseID].name + ' at human month ' + (s.monthCount, s.diseases[diseaseID].periods[periodID].d.getMonth() + 1));
        if (isArranging === undefined) {
          isArranging = false;
        }
        var year = s.diseases[diseaseID].periods[periodID].d.getFullYear();
        var month = s.diseases[diseaseID].periods[periodID].d.getMonth() + 1;
        var day = s.diseases[diseaseID].periods[periodID].d.getDate();
        var cycle = s.diseases[diseaseID].periods[periodID].cycle;
        var vaccineName;
        if (s.diseases[diseaseID].periods[periodID].customName !== undefined) {
          vaccineName = s.diseases[diseaseID].periods[periodID].customName;
        } else {
          vaccineName = s.diseases[diseaseID].vaccine;
        }
        var picker = calendar.datePicker.construct();
        // e is period locator div count in vaccine list
        var monthName = s.monthsAbbr[month - 1];
        var yearLabel = 'this';
        if (year !== s.initialYear) {
          yearLabel = 'next';
        }
        var locatorHTML;
        if (isArranging === true) {
          locatorHTML = '<div class="vaccine-locator"';
        } else if (isArranging === false) {
          locatorHTML = '<div class="vaccine-locator initialising"';
        }
        locatorHTML += ' data-period-id="' + periodID + '" data-year="' + yearLabel + '" data-cycle="' + cycle + '"';
        if (s.initStatus != 1) {
          locatorHTML += ' data-is-default="true"';
        } else {
          locatorHTML += ' data-is-default="false"';
        }
        locatorHTML += '>';
        locatorHTML += '<div class="locator-label"><span class="date-displayer"';
        if (vaccineName.length > 25) {
          locatorHTML += ' style="font-size: 10px; line-height: 13px"';
        }
        locatorHTML +='>' + day + '/' + month + '<span class="vaccine-year"';
        if (vaccineName.length > 25) {
          locatorHTML += ' style="font-size: 10px; line-height: 13px"';
        }
        locatorHTML += '>/' + year + '</span></span>';
        locatorHTML += '<span class="vaccine-displayer"';
        if (vaccineName.length > 25) {
          locatorHTML += ' style="font-size: 10px; line-height: 13px"';
        }
        locatorHTML += '>' + vaccineName + '</span></div>';
        locatorHTML += picker + '</div>';
        return locatorHTML;
      },

      initLocators: function(scope,diseaseID) {

        if (scope === undefined) {
          scope = 'global';
        }
        if (scope === 'global') {
          // on initialisation, the program loops through the diseases and
          // constructs default locators for 1 vaccine period for each of them
          // and then append them to their corresponding col-disease's.

          for (var j = 0; j < s.diseases.length; j++) {
            for (var k = 0; k < s.diseases[j].periods.length; k++) {
              calendar.vaccine.newLocator(scope, k, j);
            }
            calendar.datePicker.loadVaccineInfo(j);
          }
        } else if (scope === 'disease') {
          // if scope is disease -> remove all previous DOM elements
          $('[data-diseasecol-id=' + diseaseID + '] .vaccine-locator').remove();
          for (var i = 0; i < s.diseases[diseaseID].periods.length; i++) {
            calendar.vaccine.newLocator(scope, i, diseaseID);
          }
          calendar.datePicker.loadVaccineInfo(diseaseID);
        }

      },

      newLocator: function(scope, periodID, diseaseID) {
        var locatorPrepped;
        if (scope === 'global') {
          locatorPrepped = calendar.vaccine.constructLocator(periodID, diseaseID, false);
        } else {
          locatorPrepped = calendar.vaccine.constructLocator(periodID, diseaseID, true);
        }
        var diseaseCol = $('[data-diseasecol-id="' + diseaseID + '"]');
        diseaseCol.append(locatorPrepped);
        calendar.datePicker.loadVaccineInfo(diseaseID);
        setTimeout(function() {
          $('.vaccine-locator').removeClass('initialising');
          $('.vaccine-date-picker').each(function() {
            calendar.datePicker.generateMonths($(this));
            calendar.datePicker.generateDates($(this));
            var diseaseID = $(this).parents('.col-disease').attr('data-diseasecol-id');
            var periodID = $(this).parents('.vaccine-locator').attr('data-period-id');
            calendar.datePicker.refreshPickerValue(diseaseID,periodID);
          });
        }, 100);
      },

      locate: function(diseaseID, periodID, position) {
        var locator = $('.col-disease').eq(diseaseID).find('.vaccine-locator[data-period-id="' + periodID + '"]');
        var inYear = s.diseases[diseaseID].periods[periodID].d.getFullYear();
        var monthID = s.diseases[diseaseID].periods[periodID].d.getMonth();
        var positionIndex = 0;
        // console.log(s.positionIncrement);
        if (inYear === s.initialYear) {
          positionIndex = s.currentYearRemainingMonths - (12 - monthID) + 1;
        } else {
          positionIndex = s.currentYearRemainingMonths + monthID + 1;
        }
        position = positionIndex * s.positionIncrement + '%';
        var yearLabel = 'this';
        if (inYear !== s.initialYear) {
          yearLabel = 'next';
        }
        // console.log('Locating disease ' +  s.diseases[diseaseID].vaccine + ' at human month ' + (s.monthCount, s.diseases[diseaseID].periods[periodID].d.getMonth() + 1));
        locator.css('top', position);
        locator.attr('data-month', (monthID + 1));
        locator.attr('data-year', yearLabel);
        calendar.datePicker.refreshPickerValue(diseaseID, periodID);
        calendar.vaccine.checkLocatorCount(diseaseID);
      },

      initVaccines: function(scope,diseaseID) {
        if (scope === undefined) {
          scope = 'global';
        }
        calendar.vaccine.initLocators(scope,diseaseID);
        if (scope === 'global') {
          for (var i = 0; i < s.count.disease; i++) {
            var e = '';
            for (var j = 0; j < s.diseases[i].periods.length; j++) {
              calendar.vaccine.locate(i, j, e);
            }
          }
        } else if (scope === 'disease') {
          for (var k = 0; k < s.diseases[diseaseID].periods.length; k++) {
            var f = '';
            calendar.vaccine.locate(diseaseID, k, f);
          }
        }
      },

      relocate: function(e, periodID, ny, nm, nd) {
        var diseaseID = e.parents('.col-disease').attr('data-diseasecol-id');
        // console.log('relocate working, dataset: y/m/d:' + ny + '/' + nm + '/' + nd);
        calendar.date.update(diseaseID, periodID, ny, nm, nd);
        // console.log(s.diseases[diseaseID].periods[periodID].d);
        // console.log('relocate running!');
        // console.log(s.diseases[diseaseID].periods[periodID].d.getMonth());
        calendar.vaccine.locate(diseaseID, periodID, nm);
      },

      checkLocatorCount: function(diseaseID) {
        // get disease column
        var diseaseCol = $('[data-diseasecol-id=' + diseaseID + ']');
        var monthsToProcess = [];
        // get the month values
        var periodMonthsArray = [];
        for (var j = 0; j < s.diseases[diseaseID].periods.length; j++) {
          periodMonthsArray.push([s.diseases[diseaseID].periods[j].d.getFullYear(), s.diseases[diseaseID].periods[j].d.getMonth()].toString());
        }
        periodMonthsArray.sort();
        for (var k = 0; k < periodMonthsArray.length; k++) {
          // check if there are already 2 periods on this month
          // get the kth object in the months array:
          var monthToCheckInArray = periodMonthsArray[k].toString();
          // see how many of this year/month combo are in the array:
          // check the first instance of k in the array
          var monthIdx = periodMonthsArray.indexOf(monthToCheckInArray);
          // set up counter
          // console.log(monthToCheckInArray + '\'s first appearance in the array is ' + monthIdx );
          var monthIndices = [];
          while (monthIdx != -1) {
            // does k still exist in the rest of the array? if yes do the following:
            // add k's position into monthIndices
            monthIndices.push(monthIdx);
            // find k again from the next position
            monthIdx = periodMonthsArray.indexOf(monthToCheckInArray, monthIdx + 1);
          }
          // console.log('month k:' + monthToCheckInArray);
          // console.log('month k counted: ' + monthIndices);

          if (monthIndices.length > 1) {
            // if so, check if the month is already in the monthsToProcess
            var tempIdx = monthsToProcess.indexOf(monthToCheckInArray);
            // console.log(monthToCheckInArray + ' , ' + monthsToProcess);
            // console.log(tempIdx);
            if (monthsToProcess.indexOf(monthToCheckInArray) === -1) {
              // if not, save this month to monthsToProcess
              monthsToProcess.push(monthToCheckInArray);
            }
          }
          // console.log('monthsToProcess = ' + monthsToProcess);
        }

        // pass this disease and monthsToProcess to monthDivider()
        calendar.vaccine.monthsDivider(diseaseID, monthsToProcess);
      },

      monthsDivider: function(diseaseID, monthsToProcess) {
        // this function divides 2-periods months into 2 columns, or cancel this effect when one period is moved away
        // console.log('monthsDivider running at disease ' + diseaseID + ', monthsToProcess ' + monthsToProcess);
        var allMonthsRaw = [];
        for (var i = 0; i < s.diseases[diseaseID].periods.length; i++) {
          // construct an array of all months in this disease
          allMonthsRaw.push([s.diseases[diseaseID].periods[i].d.getFullYear(), s.diseases[diseaseID].periods[i].d.getMonth()].toString());
        }
        // delete repeated months from allMonthsRaw array
        var allMonths = [];
        $.each(allMonthsRaw, function(i, j) {
          if ($.inArray(j, allMonths) === -1) {
            allMonths.push(j);
          }
        });
        // console.log(allMonths);
        // go through all months in monthsToProcess
        for (var monthProcessing = 0; monthProcessing < monthsToProcess.length; monthProcessing++) {
          // what's the year of the period?
          var y = monthsToProcess[monthProcessing].split(',')[0].toString();
          if (y === s.initialYear.toString()) {
            // change to relative year for selecting (this year or next year)
            y = 'this';
          } else {
            y = 'next';
          }
          // what's the month of the period?
          var m = parseInt(monthsToProcess[monthProcessing].split(',')[1]);
          // console.log('diseaseProcessing: '+ diseaseID + ' monthProcessing: ' + m);
          // construct a DOM selector:
          var selector = '[data-diseasecol-id=' + diseaseID + '] [data-year=' + y + '][data-month=' + (m + 1) + ']';
          // var selector2 = '[data-diseasecol-id=' + diseaseID + '] [data-year=' + y + '][data-month=' + (m + 1) + ']:eq(2)';
          // console.log(selector);
          // split & align:
          $(selector).css('width', '50%');
          $(selector + ':eq(1)').css('right', '0');
          // mark as halfed (for styling):
          $(selector).attr('data-visual-width', 'half');
        }
        // duplicate allMonths to restOfMonths:
        var restOfMonths = allMonths.slice(0);
        // go through all monthsToProcess:
        for (var j = 0; j < monthsToProcess.length; j++) {
          // if the month is within monthsToProcess, get its index in the restOfMonths array
          var k = restOfMonths.indexOf(monthsToProcess[j].toString());
          // console.log('month index to check if exist in months to process: ' + k);
          if (k !== -1) {
            restOfMonths.splice(k, 1);
            // console.log('restOfMonths = ' + restOfMonths);
          }
        }
        // go through all the months that's not to be divided
        $.each(restOfMonths, function(i, j) {
          // get it's year
          var y = j.split(',')[0].toString();
          if (y === s.initialYear.toString()) {
            // change to relative year for selecting (this year or next year)
            y = 'this';
          } else {
            y = 'next';
          }
          // get it's month
          var m = parseInt(j.split(',')[1]);
          // build DOM selector:
          var selector = '[data-diseasecol-id=' + diseaseID + '] [data-year=' + y + '][data-month=' + (m + 1) + ']';
          // reset to 100% and no horizontal positioning:
          $(selector).css('width', '100%').css('right', 'auto');
          // reset halfed
          $(selector).attr('data-visual-width', 'full');
        });
      },

      newPeriod: function(diseaseID, m) {
        // m is the target Month.
        var newPeriodID = s.diseases[diseaseID].periods.length;
        var y = s.initialYear;
        if (m === undefined) {
          m = s.currentMonth - 1;
        }
        if (m > 11) {
          // if an 2017 month is clicked:
          m = m - 12;
          y++;
        }
        var phpMonth = (m + 1).toString();
        if (phpMonth < 10) {
          phpMonth = '0' + phpMonth;
        }
        var newPeriodObject = {
          date: y + ',' + phpMonth + ',01',
          d: new Date(y, m, 1),
        };
        // console.log(newPeriodID);
        s.diseases[diseaseID].periods.push(newPeriodObject);
        // console.log(s.diseases[diseaseID]);
        calendar.vaccine.newLocator('global', newPeriodID, diseaseID);
        calendar.vaccine.locate(diseaseID, newPeriodID);
        calendar.datePicker.generateOptions();
      },

      newPeriodAt: function(e, isFull) {
        var diseaseID = e.parent().attr('data-diseasecol-id');
        var newPeriodMonth = e.index() - 2 + parseInt(s.currentMonth) - 1;
        // console.log('newPeriodAt new month:' + newPeriodMonth);
        if (!isFull) {
          // UNDER CONSTRUCTION
          // e is the cell that got clicked - with corresponding month and disease accessible!
          // console.log('newperiodAt running');
          calendar.vaccine.newPeriod(diseaseID, newPeriodMonth);
          calendar.vaccine.checkPeriodCount(e, diseaseID);
        } else {
          var msgType = 'overflowingPeriods';
          var warningMsg = 'We suggested ' + s.diseases[diseaseID].initialPeriodsCount + ' vaccination(s) for this disease according to the current date and the setup from the previous step. There are already ' + (s.diseases[diseaseID].periods.length) + ' vaccination(s) scheduled for this vaccine. Are you sure you want to add one more vaccination schedule?';
          var data = [diseaseID, newPeriodMonth];
          calendar.notify.initDialog(null, msgType, null, warningMsg, data);
        }
      },

      checkPeriodCount : function(e) {
        var diseaseID = e.parent().attr('data-diseasecol-id');
        var diseaseCol = $('[data-diseasecol-id = ' + diseaseID + ']');
        var periodCount = diseaseCol.find('.vaccine-locator').length;
        // console.log(diseaseID);
        var isFull = periodCount >= s.diseases[diseaseID].maxPeriods;
        calendar.vaccine.toggleAddPeriod(diseaseID, periodCount);
        return isFull;
      },

      toggleAddPeriod : function(diseaseID, periodCount) {
        var diseaseCol = $('[data-diseasecol-id = ' + diseaseID + ']');
        if (periodCount >= (s.diseases[diseaseID].maxPeriods)) {
          // diseaseCol.addClass('add-period-disabled');
          diseaseCol.addClass('add-period-warning');
          // console.info('add period disabled for column' + diseaseID);
        } else {
          // diseaseCol.removeClass('add-period-disabled');
          diseaseCol.removeClass('add-period-warning');
          // console.info('add period activated for column' + diseaseID);
        }
      },

      arrange : function(scope, diseaseID, bufferRun, pendingPeriodID, pendingNewDate, fromCycle) {
        // initialisation function to sort the period ordering ID

        var result = '';

        if (bufferRun === undefined) {
          bufferRun = false;
          // if it's a buffer run we arrange the dates with the pending date and do nothing to the dataset.
        }

        if (scope === 'all') {
          for (var i = 0; i < s.diseases.length; i++) {
            calendar.vaccine.arranger(scope, i, bufferRun, pendingPeriodID, pendingNewDate, fromCycle);
          }
        } else if (scope === undefined) {
          scope = 'disease';
        }
        if (scope === 'disease') {
          result = calendar.vaccine.arranger(scope, diseaseID, bufferRun, pendingPeriodID, pendingNewDate, fromCycle);
        }

        return result;
      },

      arranger: function(scope, diseaseID, bufferRun, pendingPeriodID, pendingNewDate, fromCycle) {
        // actual function to sort the period ordering ID
        // console.log('from arranger: pendingNewDate = ' + pendingNewDate);
        if (fromCycle === undefined) {
          fromCycle = 0;
        }
        var dateIDBufferer = [];
        var bufferer = [];
        for (var periodID = 0; periodID < s.diseases[diseaseID].periods.length; periodID++) {
          // console.log(periodID + ' ' + pendingPeriodID);
          if (fromCycle === 0) {
            if (s.diseases[diseaseID].periods[periodID].cycle === 0 ||
              s.diseases[diseaseID].periods[periodID].cycle === undefined) {
              if (bufferRun === true && periodID == pendingPeriodID) {
                // console.log('pendingNewDate to be added now: ' + pendingNewDate);
                dateIDBufferer = [periodID, pendingNewDate];
              } else {
                dateIDBufferer = [periodID, s.diseases[diseaseID].periods[periodID].d];
              }
              bufferer.push(dateIDBufferer);
            }
          } else if (fromCycle === -1) {
            if (s.diseases[diseaseID].periods[periodID].cycle === -1) {
              if (bufferRun === true && periodID == pendingPeriodID) {
                dateIDBufferer = [periodID, pendingNewDate];
              } else {
                dateIDBufferer = [periodID, s.diseases[diseaseID].periods[periodID].d];
              }
              bufferer.push(dateIDBufferer);
            }
          }
        }
        bufferer.sort(function(a,b) {
          // sort by date
          return a[1] - b[1];
        });
        // console.log(bufferer);

        if (bufferRun === false) {
          // a real deal, after arranging we save the changes to the dataset and the DOM.
          // console.info('arranger taking action, with real world results!');
          if (scope === 'disease') {
            // console.log('Joggling with disease column #' + diseaseID +  '...');
            // console.warn('nothing happened... bit too quiet here.');
            s.diseases[diseaseID].periods.sort(function(a, b) {
              return a.d - b.d;
            });
            // console.log(s.diseases[diseaseID].periods);
            calendar.vaccine.initVaccines('disease',diseaseID);
            calendar.datePicker.generateOptions();
          }
        } else {
          return bufferer;
        }
      },

      destroy: function(e) {

        // e is the delete button on date picker
        var diseaseID = e.parents('.col-disease').attr('data-diseasecol-id');
        var periodID = e.parents('.vaccine-locator').attr('data-period-id');
        s.diseases[diseaseID].periods.splice(periodID, 1);
        e.parents('.vaccine-locator').addClass('initialising');
        setTimeout(function(){
          var periodCount = s.diseases[diseaseID].periods.length;
          calendar.vaccine.toggleAddPeriod(diseaseID, periodCount);
          calendar.vaccine.checkLocatorCount(diseaseID);

          calendar.vaccine.arrange('disease', diseaseID, false, null, null);
        },250);

      },

    },

    // ----------------------------
    // date picker

    datePicker: {

      toggleDisplay: function(e) {
        // toggles the display of date picker for all vaccine labels
        // console.log('running');
        e.parent().toggleClass('date-picker-on').find('.vaccine-date-picker').toggle();
        e.parents('.col-disease').toggleClass('date-picker-on');
        e.find('.vaccine-locator').toggleClass('date-picker-on');
        $('#calendar-composer').toggleClass('date-picker-on');
        calendar.datePicker.watchUserClick(e);
      },

      watchUserClick: function(e) {
        var pickerSelect = e.parent().find('.vaccine-date-picker');
        if ($('#calendar-composer').hasClass('date-picker-on')) {
          $(document).on('mouseup.watchPicker', function(f) {
            var picker = pickerSelect;
            if (!picker.is(f.target) && picker.has(f.target).length === 0) // ... nor a descendant of the picker=
            {
              e.parent().removeClass('date-picker-on').find('.vaccine-date-picker').hide();
              e.parents('.col-disease').removeClass('date-picker-on');
              e.find('.vaccine-locator').removeClass('date-picker-on');
              $('#calendar-composer').removeClass('date-picker-on');
              $(document).off('mouseup.watchPicker');
            }
          });
        }
      },

      construct: function() {
        // replace with real compiling scripts!
        // console.log('vaccineConstuctorWorking');
        return o.pickerBase;
      },

      refreshPickerValue: function(e, i) {
        // this function gathers the current month and date of the vaccine period [i] and applys to the select dropdowns
        // console.log('refreshPickerValue running');
        var currentYear  = s.diseases[e].periods[i].d.getFullYear();
        var currentMonth = s.diseases[e].periods[i].d.getMonth() + 1;
        var currentDay   = s.diseases[e].periods[i].d.getDate();
        var picker = $('.col-disease').eq(e).find('.vaccine-locator[data-period-id="' + i + '"]').find('.vaccine-date-picker');
        picker.find('option').removeAttr('selected');
        var yearSelector  = 'option[value=' + currentYear + ']';
        var monthSelector = 'option[value=' + currentMonth + ']';
        var daySelector   = 'option[value=' + currentDay + ']';
        // console.log(monthSelector);
        // console.log(daySelector);
        picker.children('.vaccine-year-select').children(yearSelector).prop('selected', 'selected');
        picker.children('.vaccine-month-select').children(monthSelector).prop('selected', 'selected');
        picker.children('.vaccine-day-select').children(daySelector).prop('selected', 'selected');
      },

      generateYears: function($parent) {
        var html = '';
        var dropdown       = $parent.find('.vaccine-year-select');
        var currentDisease = $parent.parents('.col-disease').attr('data-diseasecol-id');
        var currentPeriod  = $parent.parents('.vaccine-locator').attr('data-period-id');
        var periodYear     = s.diseases[currentDisease].periods[currentPeriod].date.split(',')[0];
        if (periodYear === s.initialYear) {
          html += '<option value="' + s.initialYear + '" selected>' + s.initialYear + '</option>';
          html += '<option value="' + (parseInt(s.initialYear) + 1) + '">' + (parseInt(s.initialYear) + 1) + '</option>';
        } else {
          html += '<option value="' + s.initialYear + '">' + s.initialYear + '</option>';
          html += '<option value="' + (parseInt(s.initialYear) + 1) + '" selected>' + (parseInt(s.initialYear) + 1) + '</option>';
        }
        dropdown.html(html);

      },

      generateMonths: function($parent) {
        var html = '';
        var year = parseInt($parent.parents('.vaccine-locator').find('.vaccine-year-select').val());
        if (year === s.initialYear) {
          for (var i = 0; i < s.currentYearRemainingMonths; i++) {
            var monthValue = parseInt(s.currentMonth) + i;
            html += '<option value="' + monthValue + '">' + s.months[(monthValue - 1)] + '</option>';
          }
        } else if (year === (s.initialYear + 1)) {
          for (var j = 0; j < 12; j++) {
            html += '<option value="' + (j+1) + '">' + s.months[(j)] + '</option>';
          }
        }
        $parent.find('.vaccine-month-select').html(html);
      },

      generateDates: function($parent) {
        var html = '',
          days   = 28,
          month  = $parent.find('.vaccine-month-select').val(),
          year   = $parent.find('.vaccine-year-select').val(),
          preDay = $parent.find('.vaccine-day-select').val();
        if (month == 1 || month == 3 || month == 5 || month == 7 || month == 8 || month == 10 || month == 12) {
          days = 31;
        } else if (month == 4 || month == 6 || month == 9 || month == 11) {
          days = 30;
        } else if (month == 2) {
          if (calendar.date.leapYear(year)) { // Add 29th date if leap year
            days = 29;
          }
        }
        for (var i = 1; i <= days; i++) {
          if (preDay && preDay == i) {
            html += '<option value="' + i + '" selected>' + i + '</option>';
          } else {
            html += '<option value="' + i + '">' + i + '</option>';
          }
        }
        $parent.find('.vaccine-day-select').html(html);
      },

      generateOptions: function(){
        $('.vaccine-date-picker').each(function() {
          // console.log('running here here here');
          calendar.datePicker.generateYears($(this));
          calendar.datePicker.generateMonths($(this));
          calendar.datePicker.generateDates($(this));
        });
      },

      loadVaccineInfo: function(e) {
        // console.log('vaccineLoaderWorking');
        // load vaccine info(logo and general intro/tip) into date picker
        var vaccineName = s.diseases[e].vaccine,
        vaccineLogo = s.diseases[e].vaccineLogo,
        productSPC  = s.diseases[e].productSPC,
        productIntro = s.diseases[e].vaccineIntro;

        var imageHTML = '';
        var logoFullPath = '../wp-content/plugins/vaccine-planner/plugin-pages/images/vaccine-logos/';
        if (vaccineLogo !== "") {
          logoFullPath += vaccineLogo;
          imageHTML = '<img src="' + logoFullPath + '" alt="' + s.diseases[e].vaccine + '">';
        }
        // console.log(logoFullPath);
        var diseaseCol = '[data-diseasecol-id=' + e + ']';
        // console.log(imageHTML);
        $(diseaseCol).find('.logo-container').html(imageHTML);
        $(diseaseCol).find('.vaccine-name').html(vaccineName);
        if (productSPC !== '') {
          SPCLink = "Click <a href='" + productSPC + "' target='_blank'>here</a> to read product SPC.";
          $(diseaseCol).find('.vaccine-spc').html(SPCLink);
        }
        if (s.diseases[e].diseaseId === 17) {
          $(diseaseCol).find('.vaccine-spc').html(productIntro);
        }
      },

      confirm : function(e) {
        // the function to run when 'confirm' button in date picker is clicked
        // e is the confirm button itself
        // console.log(e.parent());
        var diseaseID = e.parents('.col-disease').attr('data-diseasecol-id');
        var periodID  = e.parents('.vaccine-locator').attr('data-period-id');

            // get previous date
        var prevDate  = s.diseases[diseaseID].periods[periodID].date.split(',');

        var newYear   = e.parent().children('.vaccine-year-select').children('option:selected').attr('value');
        var newMonth  = e.parent().children('.vaccine-month-select').children('option:selected').attr('value');
        var newDay    = e.parent().children('.vaccine-day-select').children('option:selected').attr('value');

            //prepare new date for validation:
        var nmPHP     = calendar.date.toDoubleDigit(newMonth);
        var ndPHP     = calendar.date.toDoubleDigit(newDay);
        var newDate   = [newYear, nmPHP, ndPHP];

        var validateIndex = calendar.validate.init(e, diseaseID, periodID, prevDate, newDate);

        var data      = [];

        var SPCLink;
        if (s.diseases[diseaseID].productSPC === null) {
          SPCLink = '<span style="opacity: 0.6; font-style: italics;>No product SPC available.</span>';
        } else {
          var productSPC = s.diseases[diseaseID].productSPC;
          SPCLink = "Click <a href='" + productSPC + "' target='_blank'>here</a> to read product SPC.";
        }

        if (validateIndex === 2) {
          // valid date.
          calendar.datePicker.hide(e);
          calendar.datePicker.refreshValues(e, periodID, newYear, newMonth, newDay);
          calendar.vaccine.relocate(e, periodID, newYear, newMonth, newDay);
          console.info('The date has been validated. No triggers will be displayed.');
          // calendar.notify.debugPrint('<strong>The date has been validated. No triggers will be displayed.</strong>');
        } else if (validateIndex === 1) {
          // sips coffee
        } else if (validateIndex === -1) {
          msgType    = 'occupiedMonth';
          warningMsg = 'You have already set up 2 vaccination periods on the chosen month. Please select a new month.';
          calendar.notify.initDialog(null, msgType, null, warningMsg, null);
        } else if (validateIndex === -2) {
          msgType = 'warningDate';
          if (s.validationBufferer.vaccineDateDifference !== 0 && s.validationBufferer.isViolatingVaccineRelativeRule === true) {
            warningMsg = 'The first two vaccines in the current vaccination year are <strong>' + s.validationBufferer.vaccineDateDifference + '</strong> days apart. <br>Please read following information and check your new date again.';
            s.validationBufferer.isViolatingVaccineRelativeRule = false;
            s.validationBufferer.vaccineDateDifference = 0;
          } else {
            warningMsg = 'The date you have chosen did not fall in our suggested period for the vaccine.';
          }
          warningMsg += '<br><strong>' + SPCLink;
          warningMsg += '</strong><br>';
          msg = s.diseases[diseaseID].vaccineIntro;
          data = [e, periodID, newDate];
          calendar.notify.initDialog(e, msgType, msg, warningMsg, data);
        } else if (validateIndex === -3) {
          // safeperiod violated by other non compatible diseases
          msgType    = 'safePeriodViolated';
          warningMsg = 'A vaccine for <strong>' + s.validationBufferer.safePeriodCause + '</strong> has been scheduled within 14 days after your chosen date for this vaccine.';
          s.validationBufferer.safePeriodCause = '';
          data       = [e, periodID, newDate];
          calendar.notify.initDialog(e, msgType, null, warningMsg, data);
        } else if (validateIndex === -4) {
          msgType    = 'otherSafePeriodViolated';
          warningMsg = 'The date you selected is within 14 days after a scheduled vaccination for <strong>' + s.validationBufferer.safePeriodCause + '</strong>.';
          s.validationBufferer.safePeriodCause = '';
          data       = [e, periodID, newDate];
          calendar.notify.initDialog(e, msgType, null, warningMsg, data);
        } else if (validateIndex === -5) {
          msgType    = 'incompatibleDiseaseViolated';
          warningMsg = 'The date you selected is within 14 days after a scheduled vaccination for <strong>' + s.validationBufferer.safePeriodCause + '</strong>.';
          s.validationBufferer.safePeriodCause = '';
          data       = [e, periodID, newDate];
          calendar.notify.initDialog(e, msgType, null, warningMsg, data);
        } else if (validateIndex === -6) {
          var diseaseList = [];
          var combo = s.diseases[diseaseID].warningCombination;
          var diseaseListOutput = '';
          for (var i = 0; i < s.diseases.length; i ++) {
            for (var key in combo) {
              if (s.diseases[i].diseaseId === combo[key]) {
                diseaseList.push(s.diseases[i].name);
              }
            }
          }
          for (var k in diseaseList) {
            diseaseListOutput += '<strong>' + diseaseList[k] + '</strong>';
            if (k.toString() === (diseaseList.length - 2).toString()) {
              diseaseListOutput += ' and ';
            } else if (k.toString() === (diseaseList.length - 1).toString()){
              diseaseListOutput += '';
            } else {
              diseaseListOutput += ', ';
            }
          }
          msgType    = 'warningComboExist';
          warningMsg = 'Please check the dates for ' + diseaseListOutput + '.';
          data       = [e, periodID, newDate];
          calendar.notify.initDialog(e, msgType, null, warningMsg, data);
        } else if (validateIndex === -7) {
          msgType    = 'crashingDates';
          warningMsg = 'Please select a new date for this vaccine.';
          data       = [e, periodID, newDate];
          calendar.notify.initDialog(e, msgType, null, warningMsg, data);
        } else if (validateIndex === -8) {
          msgType    = 'embryosAttacked';
          calendar.notify.initDialog(e, msgType, null, null, null);
        } else if (validateIndex === -9) {
          msgType    = 'externalCrashingDates';
          warningMsg = 'We noticed that a vaccine for <strong>' + s.validationBufferer.crashingDisease + '</strong> was already scheduled on this date. We do not recommend them to be administered together on the same date.';
          s.validationBufferer.crashingDisease = '';
          data       = [e, periodID, newDate];
          calendar.notify.initDialog(e, msgType, null, warningMsg, data);
        } else if (validateIndex === -10) {
          msgType    = 'outOfCalendar';
          warningMsg = 'Please choose a new date that\'s on the calendar.';
          data       = [e, periodID, newDate];
          calendar.notify.initDialog(e, msgType, null, warningMsg, data);
        } else if (validateIndex === -11) {
          msgType    = 'onBirthDate';
          data       = [e, periodID, newDate];
          calendar.notify.initDialog(e, msgType, null, null, null);
        } else if (validateIndex === -12) {
          msgType    = 'onBreedingDate';
          data       = [e, periodID, newDate];
          calendar.notify.initDialog(e, msgType, null, null, null);
        } else if (validateIndex === -99) {
          msgType    = 'previousCycle';
          warningMsg = 'We recommend you to read the product SPC before editing this vaccination. If you would like to change the vaccine to a date that belongs to the current vaccination year set from previous step, please delete this vaccination schedule and create a new one.<br>';
          warningMsg += SPCLink;
          data       = [e, periodID, newDate];
          calendar.notify.initDialog(e, msgType, null, warningMsg, data);
        }

      },

      hide: function(e) {
        // the function to run when 'hide' button in date picker is clicked
        // console.log('hideandseal');
        e.parents('.vaccine-date-picker').hide();
        $('#calendar-container').find('.date-picker-on').removeClass('date-picker-on');
      },

      undo: function(e) {
        // reset changes to the input fields, not yet done
        calendar.datePicker.hide(e);
        $(document).off('mouseup.watchPicker');
      },

      refreshValues: function(e, periodID, ny, nm, nd) {
        var diseaseID    = e.parents('.col-disease').attr('data-diseasecol-id');
        var targetPeriod = '[data-period-id=' + periodID + ']';
        // console.log('t = ' + targetPeriod);
        var label        = e.parents('.col-disease').children(targetPeriod).find('.date-displayer');
        var monthID      = parseInt(nm);
        var newMonthDate = nd + '/' + monthID + '<span class="vaccine-year"';
        if (s.diseases[diseaseID].vaccine.length > 25) {
          newMonthDate += ' style="font-size: 10px; line-height: 13px"';
        }
        newMonthDate += '>/' + ny + '</span>';
        label.html(newMonthDate);
        // console.log([periodID]);
        calendar.datePicker.refreshPickerValue(diseaseID, periodID);
      },

    },

    validate : {

      variables: {
        newDateJS: '',
      },

      init: function(e, diseaseID, periodID, prevDate, newDate) {

        var cycleCount = s.diseases[diseaseID].periods[periodID].cycle;

        var vlv = calendar.validate.variables;
        // calendar.notify.debugPrint('--------------');
        console.info('//// validating vaccination[' + periodID + '] in disease #' + s.diseases[diseaseID].diseaseId + ' ' + s.diseases[diseaseID].name + ', cycle: ' +  cycleCount + '...');
        // calendar.notify.debugPrint('<strong><em>validating vaccination[' + periodID + '] in disease #' + s.diseases[diseaseID].diseaseId + ' ' + s.diseases[diseaseID].name + '...</em></strong>');

        // the function to run when user defines a new date in the date picker.
        // Validator will not run when the program is rendering the default dates from PHP.

        var i = null;  // not validated;

        if (s.initStatus === 1) {
          // initStatus === 1 means the whole initialisation process has been successfully finished and calendar presented to user

          // if (cycleCount === 0 || cycleCount === undefined) {
            s.validationBufferer.dateNotChanged = false;

            calendar.validate.prepareNewDate(vlv, diseaseID, periodID, newDate);

            var om = calendar.validate.isOccupiedMonth(vlv, diseaseID, periodID, prevDate, newDate);
            var rl = calendar.validate.rules.init(vlv, e, diseaseID, periodID, prevDate, newDate, cycleCount);

            var spf,spb,spi,cb,cd,ea,ec,sdo;

            // safe period related rules
            if (s.diseases[diseaseID].safePeriod !== null) {
              spf = calendar.validate.checkSafePeriod(vlv, 'forwards', e, diseaseID, periodID, prevDate, newDate);
            }
            spb = calendar.validate.checkSafePeriod(vlv, 'backwards', e, diseaseID, periodID, prevDate, newDate);
            if (s.diseases[diseaseID].incompatibleDisease === true) {
              spi = calendar.validate.checkSafePeriod(vlv, 'inverse', e, diseaseID, periodID, prevDate, newDate);
            }

            // warning combination
            if (s.diseases[diseaseID].warningCombination !== []) {
              cb = calendar.validate.checkCombination(vlv, diseaseID, periodID);
              // console.info('warningCombo');
              // calendar.notify.debugPrint('warningCombo');
            }

            // same date with other vaccines
            cd = calendar.validate.crashingDates(vlv, diseaseID, periodID);

            // embryosAttacked
            if (s.diseases[diseaseID].noVaccinePreBirth === true) {
              ea = calendar.validate.embryosAttacked(vlv,diseaseID);
            }

            // is the new date even on the calendar
            ec = calendar.validate.existentialCheck(vlv);

            // is the new date the same date as either of the season dates?
            sdo = calendar.validate.seasonDateOccupied(vlv);

            // Forking pathways
            if (sdo === -1) { i                                  = -11;   // new date is on birth date
              } else { if (sdo === -2) { i                       = -12;   // new date is on breeding date
                } else { if (ec === false) { i                   = -10;   // date is out of calendar
                  } else { if (cd === -2) { i                    = -7;    // more than 1 vaccine is going to have same date in THIS disease
                    } else { if (cd === -1) { i                  = -9;    // vaccine is on the same date with vaccines from OTHER diseases
                      } else { if (ea === true) { i              = -8;    // new date is before birth season date!
                        } else { if (spf === false) { i          = -3;    // some disease's got a vaccine in the safe period of this disease
                          } else { if (spb === false) { i        = -4;    // some disease's safe period is covering this new date
                            } else { if (spi === false) { i      = -5;    // incompatible disease violated
                              } else { if (cb === false) { i     = -6;    // warning combo happened
                                } else { if (om === true) { i    = -1;    // halt confirmation with popup from confirm
                                  } else { if (rl === false) { i = -2;    // halt confirmation with *NO* popup from confirm
                                    } else { i                 =  2;    // if b returns null, proceed
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

          // }
          // else if (cycleCount === -1) {
            // i = -99; // This is from previous cycle.
          // }
        }

        // reset new date bufferer
        vlv.newDatePrepped = [];

        // reset cycleCount

        return i;

      },

      prepareNewDate : function(vlv, diseaseID, periodID, newDate) {
        vlv.newDateJS = new Date(newDate.toString().replace(/,/g, "/"));
        s.validationBufferer.newDate = vlv.newDateJS.toString();
        var oldDate = s.diseases[diseaseID].periods[periodID].d;
        if (oldDate.setHours(0,0,0,0).toString() === vlv.newDateJS.setHours(0,0,0,0).toString()) {
          console.info('the date has not been changed');
          s.validationBufferer.dateNotChanged = true;
        }
      },

      isOccupiedMonth: function(vlv, diseaseID, periodID, prevDate, newDate) {
        if (s.validationBufferer.dateNotChanged === false) {
          var indicator = 0;
          for (var i = 0; i < s.diseases[diseaseID].periods.length; i++) {
            // check through all periods, each time set up a dateBufferer storing the date of it
            var dateBufferer = s.diseases[diseaseID].periods[i].date.split(',');
            // compare this with the newly selected date
            // console.log(dateBufferer, newDate);
            if (dateBufferer[0] === newDate[0] && dateBufferer[1] === newDate[1]) {
              // if the dates's year and months are the same
              // get the year+month count
              var monthToCheck = newDate[0] + ',' + (parseInt(newDate[1]) - 1);

              // set up a month array of this disease's periods
              var periodMonthsArray = [];
              for (var j = 0; j < s.diseases[diseaseID].periods.length; j++) {
                // toString() is to change an object to a string for later comparison usng indexOf. Since two objects can never be strictly equal but two strings can. indexOf requires strict equal.
                periodMonthsArray.push([s.diseases[diseaseID].periods[j].d.getFullYear(), s.diseases[diseaseID].periods[j].d.getMonth()].toString());
              }
              periodMonthsArray.sort();
              // console.log('periodMonthsArray from validator: ' + periodMonthsArray);
              for (var k = 0; k < periodMonthsArray.length; k++) {
                // check if there are already 2 periods on this month
                // get the kth object in the months array:
                var monthToCheckInArray = periodMonthsArray[k].toString();
                // see how many of this year/month combo are in the array:
                // check the first instance of k in the array
                var monthIdx = periodMonthsArray.indexOf(monthToCheckInArray);
                // set up counter
                // console.log(monthToCheckInArray + '\'s first appearance in the array is ' + monthIdx );
                var monthIndices = [];
                while (monthIdx != -1) {
                  // does k still exist in the rest of the array? if yes do the following:
                  // add k's position into monthIndices
                  monthIndices.push(monthIdx);
                  // find k again from the next position
                  monthIdx = periodMonthsArray.indexOf(monthToCheckInArray, monthIdx + 1);
                }

                if (monthIndices.length > 1 && monthToCheckInArray === monthToCheck) {
                  // console.log('they are the same');
                  // if so, indicator = 1 -> month full
                  indicator = 1;
                  break;
                }
                // else indicator stay as 0 -> put the period down
              }
            }
          }
          if (indicator === 1) {
            return true;
          } else {
            return false;
          }
        } else {
          return false;
        }
      },

      rules : {

        variables : {
          // indicators ---------------------------------
          indicator:         0,    rulesIndicator:    0,
          // reference date (e.g. season date) ----------
          seasonDate:        '',
          // rules --------------------------------------
          ruleSet:           [],   rule:              '',
          range:             '',   rangeType:         '',
          ruleType:          '',   joinedRange:       [],
          // new date range type: does the new date fall in (joined) range or out of (joined) range?
          newDateRangeType:  '',
        },

        init : function(vlv, e, diseaseID, periodID, prevDate, newDate) {

          // short hands
          var rl = calendar.validate.rules;
          var rlv = rl.variables;
          var validatorResult = null;
          var validatorResultBundle = [];

          // check if any rule is defined
          rlv.ruleSet = s.diseases[diseaseID].rules;
          // console.log(rlv.ruleSet);
          for (var key in rlv.ruleSet) {
            if (rlv.ruleSet[key] !== null) {

              rlv.rulesIndicator = 1;
              rlv.rule = key;
              rlv.ruleType = key.split('Relative')[0];
              // console.log('rlv.ruleType: '+ rlv.ruleType);
              rlv.range = rlv.ruleSet[key];
              if (key.endsWith('In')) {
                rlv.rangeType = 'in';
              } else if (key.endsWith('Out')) {
                rlv.rangeType = 'out';
              }
              console.info('RULE ' + rlv.rule + ' exists in '+ s.diseases[diseaseID].name +': [' + rlv.range + ']');
              // calendar.notify.debugPrint('RULE ' + rlv.rule + ' exists in '+ s.diseases[diseaseID].name +': [' + rlv.range + ']');

              if (rlv.rulesIndicator === 0) {
                // no rules defined: return null
                console.info('no rules to validate.');
                // calendar.notify.debugPrint('no rules to validate.');
              } else if (rlv.rulesIndicator === 1) {
                // rule exist, start the party

                // pass on to ruleset validators
                validatorResult = rl.validateSeason(vlv, rlv.ruleType, rl, rlv, e, diseaseID, periodID, newDate);
                // return result to rules validation array
                validatorResultBundle.push(validatorResult);
                // reset bufferers
                validatorResult = null;
                rlv.rule = null;
                rlv.ruleType = null;
                rlv.range = null;
                rlv.rangeType = null;
              }
            }
          }
          // if one rule is wrong, ruleset validator will return false
          if (validatorResultBundle.indexOf(false) > -1) { return false; } else { return true;}
        },


        joinRange : function(rl, rlv, e, diseaseID, periodID){

          // get month and date of seasonDate:
          var seasonDateSplitted = rlv.seasonDate.toString().split(/,|\//);
          // join above back together in MM,DD
          var seasonDateCurrentPre = [];
          var seasonDatePrevPre = [];
          for (var i = 2; i > -1 ; i --) {
            seasonDateCurrentPre.push(seasonDateSplitted[i]);
          }
          for (var j = 2; j > -1 ; j --) {
            if (j === 2) {
              seasonDatePrevPre.push((parseInt(seasonDateSplitted[j]) - 1).toString());
            } else {
              seasonDatePrevPre.push(seasonDateSplitted[j]);
            }
          }
          // console.log(seasonDateCurrentPre.toString().replace(/,/g, '/'));
          seasonDateCurrent = new Date(seasonDateCurrentPre.toString().replace(/,/g, '/'));
          seasonDatePrev = new Date(seasonDatePrevPre.toString().replace(/,/g, '/'));

          // join 2 as one array
          // add first range

          // console.log('rlv.range = ' + rlv.range + ', (parseInt(rlv.range[0]) = ' + (parseInt(rlv.range[0])));
          var range0_1 = new Date(seasonDateCurrent.getTime()).setDate(seasonDateCurrent.getDate() + (parseInt(rlv.range[0])));
          var range0_2 = new Date(seasonDateCurrent.getTime()).setDate(seasonDateCurrent.getDate() + (parseInt(rlv.range[1])));

          var range1_1 = new Date(seasonDatePrev.getTime()).setDate(seasonDatePrev.getDate() + (parseInt(rlv.range[0])));
          var range1_2 = new Date(seasonDatePrev.getTime()).setDate(seasonDatePrev.getDate() + (parseInt(rlv.range[1])));

          rlv.joinedRange = [
            [new Date(range0_1) , new Date(range0_2)],
            [new Date(range1_1) , new Date(range1_2)]
          ];

          // console.log(seasonDateProcessing.toString().replace(/,/g, '/'));
          // console.log('rlv.joinedRange = ' + rlv.joinedRange);

        },

        validateSeason : function(vlv, ruleType, rl, rlv, e, diseaseID, periodID, newDate){

          // first let's validate non vaccine related rules:

          if (ruleType !== 'vaccine') {

            if (ruleType === 'birth') {
              // console.info('birth ready to run');
              rlv.seasonDate = s.birthDate;
            } else if (ruleType === 'breeding') {
              // console.info('breeding ready to run');
              rlv.seasonDate = s.breedingDate;
            }
            // Creat joins of the ranges specified by two season date and two ranges specified.
            rl.joinRange(rl, rlv, e, diseaseID, periodID);
            // find new date
            // console.log('vlv.newDateJS: ' + vlv.newDateJS);
            // compare date with joined range
            var newDateInRange0 = vlv.newDateJS >= rlv.joinedRange[0][0] && vlv.newDateJS <= rlv.joinedRange[0][1];
            var newDateInRange1 = vlv.newDateJS >= rlv.joinedRange[1][0] && vlv.newDateJS <= rlv.joinedRange[1][1];
            if ( rlv.rangeType === 'out' ) {
              newDateInRange0 = vlv.newDateJS > rlv.joinedRange[0][0] && vlv.newDateJS < rlv.joinedRange[0][1];
              newDateInRange1 = vlv.newDateJS > rlv.joinedRange[1][0] && vlv.newDateJS < rlv.joinedRange[1][1];
            }
            // if one of them was true, mark newDateRangeType as in
            if (newDateInRange0 || newDateInRange1) {
              rlv.newDateRangeType = 'in';
            } else {
              // otherwise as out
              rlv.newDateRangeType = 'out';
            }
            // console.log(newDateInRange0 + ' || ' + newDateInRange1 + ' = ' + (newDateInRange0 || newDateInRange1));
          }

          else if (ruleType === 'vaccine') {
            var cycle = s.diseases[diseaseID].periods[periodID].cycle;
            var currCycleVacCounter = 0;
            for (var i = 0; i < s.diseases[diseaseID].periods.length; i++) {
              if (cycle === 0 || cycle === undefined) {
                if (s.diseases[diseaseID].periods[i].cycle === 0 ||
                  s.diseases[diseaseID].periods[i].cycle === undefined) {
                  currCycleVacCounter ++;
                }
              } else if (cycle === -1) {
                if (s.diseases[diseaseID].periods[i].cycle === -1) {
                  currCycleVacCounter ++;
                }
              }
            }
            console.log(currCycleVacCounter);
            if ((currCycleVacCounter >= 2) && (s.diseases[diseaseID].periods.length > 1)) {
              // Now we deal with vaccine rules:
              // console.info('vaccine relative validator ready to run');
              // buffer run arrange
              console.log('vlv.newDateJS from validator: ' + vlv.newDateJS + '; diseaseID:' + diseaseID);
              var newOrdering = calendar.vaccine.arrange('disease', diseaseID, true, periodID, vlv.newDateJS, cycle);
              console.log('newOrdering of vaccines:' + newOrdering);
              // how many days apart are the first two vaccines?
              var vaccineRelativity = Math.round((newOrdering[1][1] - newOrdering[0][1]) / 8.64e+07);
              console.info('The first 2 vaccines are ' + parseInt(vaccineRelativity) + ' days apart.');
              s.validationBufferer.vaccineDateDifference = parseInt(vaccineRelativity);
              // calendar.notify.debugPrint('The first 2 vaccines are ' + vaccineRelativity + ' days apart.');
              if (vaccineRelativity === 0) {
                rlv.newDateRangeType = null;
              }
              if ( rlv.rangeType === 'out' ) {
                if (vaccineRelativity >= rlv.range[0] && vaccineRelativity < rlv.range[1]) {
                  rlv.newDateRangeType = 'in'; } else { rlv.newDateRangeType = 'out'; }
              } else {
                if (vaccineRelativity > rlv.range[0] && vaccineRelativity <= rlv.range[1]) {
                  rlv.newDateRangeType = 'in'; } else { rlv.newDateRangeType = 'out'; }
              }
            } else {
              console.info('less than 2 vac in ' + s.diseases[diseaseID].name + ': vaccine relative validator n/a');
              // calendar.notify.debugPrint('less than 2 vac in ' + s.diseases[diseaseID].name + ': vaccine relative validator n/a');
              rlv.newDateRangeType = null;
            }
          }

          // console.log('new date range type: ' + rlv.newDateRangeType + '; rule range type: ' + rlv.rangeType);

          // if the newDateRangeType matches the rangeType then the date was valid.
          if (rlv.newDateRangeType !== null) {
            if (rlv.rangeType === rlv.newDateRangeType) {
              console.info(ruleType + ' relative rule has been validated.');
              // calendar.notify.debugPrint(ruleType + ' rule has been validated.');
              return true;
            } else {
              console.warn(ruleType + ' relative rule has NOT been validated.');
              if (rlv.ruleType === 'vaccine') {
                s.validationBufferer.isViolatingVaccineRelativeRule = true;
              }
              // calendar.notify.debugPrint('<strong>' + ruleType + ' rule has NOT been validated.</strong>');
              return false;
            }
          }
        }
      }, // end of ruleset validator *PHEW*

      checkSafePeriod: function(vlv, mode, e, diseaseID, periodID, prevDate, newDate) {
        var safePeriodFactor;
        if (s.diseases[diseaseID].safePeriod !== null) {
          safePeriodFactor = s.diseases[diseaseID].safePeriod;
        } else {
          safePeriodFactor = 14;
        }
        var safePeriod         = [vlv.newDateJS];
        var bracketBufferer    = '';
        var periodDateBufferer = '';
        var output             = true;
        if (mode !== 'inverse') {
          if (mode === 'forwards') {
            // create a period of specified days AFTER the new date
            bracketBufferer = new Date(new Date(vlv.newDateJS.getTime()).setDate(vlv.newDateJS.getDate() + parseInt(safePeriodFactor)));
            safePeriod.push(bracketBufferer);
          } else if (mode === 'backwards') {
            // create a period of specified days BEFORE the new date
            bracketBufferer = new Date(new Date(vlv.newDateJS.getTime()).setDate(vlv.newDateJS.getDate() - parseInt(safePeriodFactor)));
            safePeriod.unshift(bracketBufferer);
            // console.log('hey: ' + bracketBufferer);
          }
          // console.log(safePeriod);
          // loop through all diseases apart from compatibleDiseases and see if any vaccine falls in the period
          for(var i = 0; i < s.diseases.length; i ++) {
            if (mode === 'forwards') {
              // check if other vaccines are violating this vaccine's safe period
              if (s.diseases[diseaseID].compatibleDiseases.indexOf(i) >= 0) {
                for(var j = 0; j < s.diseases[i].periods.length; j++) {
                  if (j !== periodID) {
                    periodDateBufferer = s.diseases[i].periods[j].d;
                    if (periodDateBufferer >= safePeriod[0] && periodDateBufferer <= safePeriod[1]) {
                      // if so, invalid
                      s.validationBufferer.safePeriodCause = s.diseases[i].name;
                      console.info('The new date did not pass the safe period check: period[' + j + '] in disease[' + i + '] falls within the safe period of this disease[' + diseaseID + '].');
                      // calendar.notify.debugPrint('<strong>The new date did not pass the safe period check: period[' + j + '] in disease[' + i + '] falls within the safe period of this disease[' + diseaseID + '].</strong>');
                      output = false;
                      return output;
                    } else {}
                  }
                }
              }
            } else if (mode === 'backwards') {
              // check if this vaccine is violating other vaccines' safe period
              for(var k = 0; k < s.diseases[i].periods.length; k++) {
                if (i != diseaseID || (i === diseaseID && k != periodID)) {
                  if (s.diseases[i].safePeriod !== null) {
                    periodDateBufferer = s.diseases[i].periods[k].d;
                    if (periodDateBufferer >= safePeriod[0] && periodDateBufferer <= safePeriod[1]) {
                      // if so, check if this disease is within the offended disease's compatible list
                      // console.log(i + ' ' + s.diseases[diseaseID].diseaseId + ' ' + s.diseases[i].compatibleDiseases);
                      // console.log(s.diseases[i].compatibleDiseases.indexOf(s.diseases[diseaseID].diseaseId));
                      if (s.diseases[i].compatibleDiseases.indexOf(s.diseases[diseaseID].diseaseId) < 0) {
                        // if not, WAR!
                        s.validationBufferer.safePeriodCause = s.diseases[i].name;
                        console.info('The new date did not pass the safe period check: period[' + k + '] in disease#' + s.diseases[i].diseaseId + ' ' + s.diseases[i].name + ' has a safe period defined. The current period[' + k + '] disease[' + diseaseID + '] is violating this rule.');
                        // calendar.notify.debugPrint('<strong>The new date did not pass the safe period check: period[' + k + '] in disease#' + s.diseases[i].diseaseId + ' ' + s.diseases[i].name + ' has a safe period defined. The current period[' + k + '] disease[' + diseaseID + '] is violating this rule.</strong>');
                        output = false;
                        return output;
                      } else {}
                    }
                  }
                }
              }
            }
          }
          console.info('safe period (mode ' + mode + ') is safe');
          // calendar.notify.debugPrint('safe period (mode ' + mode + ') is safe');
          return output;
          // if not, valid
        } else if (mode === 'inverse') {
          // check all other vaccines to see if this vaccine's incompatible period is being violated.
          // create a period before and after the new date with specified days
          safePeriodFactor = s.diseases[diseaseID].incompatiblePeriod;
          bracketBufferer = new Date(new Date(vlv.newDateJS.getTime()).setDate(vlv.newDateJS.getDate() - parseInt(safePeriodFactor)));
          safePeriod.unshift(bracketBufferer);
          // loop through all *OTHER* diseases and see if any vaccine falls in the period
          // console.log(safePeriod);
          for(var l = 0; l < s.diseases.length; l ++) {
            if (l != diseaseID) {
              // console.log(l + ' ' + diseaseID);
              for(var m = 0; m < s.diseases[l].periods.length; m++) {
                periodDateBufferer = s.diseases[l].periods[m].d;
                if (periodDateBufferer >= safePeriod[0] && periodDateBufferer <= safePeriod[1]) {
                  // if so, invalid
                  s.validationBufferer.safePeriodCause = s.diseases[l].name;
                  console.info('incompatible disease violated by period[' + m + '] in disease#' + s.diseases[l].diseaseId + ' ' + s.diseases[l].name + '.');
                  // calendar.notify.debugPrint('<strong>period[' + m + '] in disease#' + s.diseases[l].diseaseId + ' ' + s.diseases[l].name + ' was administered less than 14 days before the new date for tribovax 10.</strong>');
                  output = false;
                  return output;
                }
              }
            }
          }
          console.info('incompatible disease safe period is safe.');
          // calendar.notify.debugPrint('incompatible disease safe period is safe.');
          // if not, valid
          return output;
        }
      },

      checkCombination : function(vlv, diseaseID, periodID){
        // get new date.
        // get the combination.
        var combo = s.diseases[diseaseID].warningCombination;
        var comboCol = [];
        for (var key in combo) {
          for (var j = 0; j < s.diseases.length; j++) {
            // console.log(s.diseases[j].diseaseId + '===' + combo[key]);
            if (s.diseases[j].diseaseId === combo[key]) {
              comboCol.push(s.diseases[j].diseaseId);
            }
          }
        }
        // console.log(combo + ' ' + comboCol);
        // calendar.notify.debugPrint(comboCol);
        if (combo.length === comboCol.length) {
          // if combination could happen
          var results = [];
          var vaccineDateBufferer;
          var validityMarker = false;
          var matchingSampleResult = [];
          // generate a sample of how the results would look if they all match
          for (var m in combo) {
            if (s.diseases[diseaseID].diseaseId.toString() === combo[m].toString()) {
              validityMarker = null;
            } else {
              validityMarker = true;
            }
            matchingSampleResult.push(validityMarker);
            validityMarker = false;
          }
          // match the new date with periods in other diseases in the combination
          for (var k in combo) {
            for (var l = 0; l < s.diseases.length; l++) {
              if ((s.diseases[l].diseaseId.toString() === combo[k].toString()) && (l.toString() !== diseaseID.toString())) {
                // console.log('combo key: ' + k + '; diseaseCol: ' + l + '; period: ' + i);
                for (var i = 0; i < s.diseases[l].periods.length; i++) {
                  vaccineDateBufferer = s.diseases[l].periods[i].d;
                  // console.log('a ' + vaccineDateBufferer.toString() + ' ' + vlv.newDateJS.toString());
                  if (vaccineDateBufferer.toString() === vlv.newDateJS.toString()) {
                    validityMarker = true;
                  }
                }
              } else if (l.toString() === diseaseID.toString()) {
                validityMarker = null;
              }
            }
            results.push(validityMarker);
            validityMarker = false;
          }

          // if the real run equals to sample
          // console.log(results + ' ' + matchingSampleResult);
          if (results.toString() === matchingSampleResult.toString() && results.toString() !== '') {
            // it's invalid.
            return false;
          } else {
            // otherwise it's good to go.
            return true;
          }

        }
      },

      crashingDates : function(vlv, diseaseID, periodID) {
        var result = 1;
        var pairables = [];
        for (var j = 0; j < s.diseases.length; j++) {
          // loop through diseases
          if (j.toString() === diseaseID.toString()) {
            // if looking at the same disease
            for (var i = 0; i < s.diseases[diseaseID].periods.length; i ++) {
              // loop through periods
              // console.log(s.diseases[diseaseID].periods[i].d.toString() + vlv.newDateJS.toString());
              if (i.toString() !== periodID.toString() && s.diseases[diseaseID].periods[i].d.setHours(0,0,0,0).toString() === vlv.newDateJS.setHours(0,0,0,0).toString()) {
                // if the period we are looking at is not current period
                // and the date is the same with the new date
                console.info('crashed with siblings!');
                result = -2; // crashed with siblings
                return result;
              }
            }
          } else {
            // let's check other diseases
            for (var k = 0; k < s.diseases[j].periods.length; k ++) {
              // console.log(j + ' ' + k);
              if (s.diseases[j].periods[k].d.setHours(0,0,0,0).toString() === vlv.newDateJS.setHours(0,0,0,0).toString()) {
                // compare this disease's this period's date to the new date
                if (s.diseases[diseaseID].pairableDiseases !== undefined) {
                  // if the current disease being changed has a pariable disease set defined
                  pairables = s.diseases[diseaseID].pairableDiseases;
                  // console.log(pairables + ' ' + s.diseases[j].diseaseId);
                  if (pairables.indexOf(s.diseases[j].diseaseId) < 0) {
                    s.validationBufferer.crashingDisease = s.diseases[j].name;
                    result = -1; // crashed with vaccines from other diseases
                  }
                } else {
                  s.validationBufferer.crashingDisease = s.diseases[j].name;
                  result = -1; // crashed with vaccines from other diseases
                }
              }
            }
          }
        }
        if (result === 1) {
          console.info('not crashing with incompatible diseases.');
        } else if (result === -1) {
          console.info('crashed...');
        }
        return result;
      },

      embryosAttacked : function(vlv, diseaseID) {
        // stops vaccines from being administered before birth date.
        if (s.hasPrevCycle === true) {
          return false;
        } else if (s.birthDateJS > vlv.newDateJS) {
          return true;
        } else {
          return false;
        }
      },

      existentialCheck : function(vlv) {
        // check if the new date is on the calendar
        var beginningOfTime = new Date().setDate(0);
        if (vlv.newDateJS < beginningOfTime) {
          return false;
        } else {
          return true;
        }
      },

      seasonDateOccupied : function(vlv) {
        var output = 0;
        if (s.birthSeason === true) {
          if (vlv.newDateJS.setHours(0,0,0,0).toString() === s.birthDateJS.setHours(0,0,0,0).toString()) {
            output = -1;
            return output;
          }
        }
        if (s.breedingSeason === true) {
          if (vlv.newDateJS.setHours(0,0,0,0).toString() === s.breedingDateJS.setHours(0,0,0,0).toString()) {
            output = -2;
            return output;
          }
        }
        return output;
      }

    },


    notify: {

      compose: function(msgType, msg, warningMsg) {
        // alert(msg);
        var dialogHTML = '<div class="dialog-view initiating"><div class="dialog"><div class="dialog-content">';
        if (msgType !== null) {
          dialogHTML += '<h2>' + o.warningTitles[msgType] + '</h2>';
        }
        if (warningMsg !== null) {
          dialogHTML += '<p>' + warningMsg + '</p>';
        }
        if (msg !== null) {
          dialogHTML += '<section>' + msg + '</section>';
        }
        dialogHTML += '</div><footer class="dialog-footer">';

        if (msgType === 'overflowingPeriods') {
          dialogHTML += '<button data-dialog-action="proceed">Continue and add a new vaccination</button>';
          dialogHTML += '<button data-dialog-action="cancel">Cancel</button>';
        }
        if (msgType === 'occupiedMonth' ||
            msgType === 'crashingDates' ||
            msgType === 'embryosAttacked' ||
            msgType === 'outOfCalendar' ||
            msgType === 'onBirthDate' ||
            msgType === 'onBreedingDate' ||
            msgType === 'pasteurellosisTip') {
          dialogHTML += '<button data-dialog-action="cancel" autofocus>OK</button>';
        }
        if (msgType === 'deleteVaccine') {
          dialogHTML += '<button data-dialog-action="proceed">Delete vaccine</button>';
          dialogHTML += '<button data-dialog-action="cancel">Cancel</button>';
        }
        if (msgType === 'warningDate' ||
            msgType === 'safePeriodViolated' ||
            msgType === 'otherSafePeriodViolated' ||
            msgType === 'incompatibleDiseaseViolated' ||
            msgType === 'warningComboExist' ||
            msgType === 'externalCrashingDates' ||
            msgType === 'previousCycle') {
          dialogHTML += '<button data-dialog-action="proceed">Proceed and schedule the vaccine</button>';
          dialogHTML += '<button data-dialog-action="cancel">Cancel changes</button>';
        }
        dialogHTML += '</footer></div></div>';
        return dialogHTML;
      },

      initDialog: function(e, msgType, msg, warningMsg, data) {
        // initiate a new dialog with
        // console.log('dialog initiating');
        $('html').addClass('dialog-out');
        var dialogHTML = calendar.notify.compose(msgType, msg, warningMsg);
        $('body').append(dialogHTML);
        // remove initiating class and fade in the dialog
        setTimeout(function() {
          $('.dialog-view').removeClass('initiating');
        }, 50);
        var command = calendar.notify.commandForker(e, msgType, data);
        return command;
      },

      commandForker: function(e, msgType, data) {
        $('.dialog-view').on('click', 'button', function() {
          var command = $(this).attr('data-dialog-action');
          if (command === 'proceed') {
            if (msgType === 'overflowingPeriods') {
              calendar.vaccine.newPeriod(data[0], data[1]);
            } else if (msgType === 'deleteVaccine') {
              calendar.vaccine.destroy(data);
            } else if (msgType === 'warningDate' ||
                       msgType === 'safePeriodViolated' ||
                       msgType === 'otherSafePeriodViolated'||
                       msgType === 'incompatibleDiseaseViolated' ||
                       msgType === 'warningComboExist' ||
                       msgType === 'externalCrashingDates' ||
                       msgType === 'previousCycle') {
              calendar.datePicker.hide(e);
              calendar.datePicker.refreshValues(e, data[1], data[2][0], data[2][1], data[2][2]);
              calendar.vaccine.relocate(e, data[1], data[2][0], data[2][1], data[2][2]);
            }
          } else if (command === 'cancel') {
            // there should have been a reset function to reset values back
            // to whatever was before the user changed the value.
            // it's not built yet.
          }
          calendar.notify.destroy();
        });
      },

      destroy: function() {
        $('html').removeClass('dialog-out');
        $('.dialog-view').addClass('exiting');
        setTimeout(function() {
          $('.dialog-view').remove();
        }, 700);
      },

      debugPrint: function(message) {
        var time = new Date().toString().split('2016')[1];
        time = time.split(' GMT')[0];
        // console.info(message);
        $('#debug-messages').prepend('<p>'+ time + ': ' + message + '</p>');
      }
    },

    output : {

      invalidCols: [],

      init: function() {
        $('#calendar-container').html('');
        $('.back-to-edit-mode').fadeIn(200);
        calendar.output.cleanup();
        var outputHTML = calendar.output.write();
        calendar.output.publish(outputHTML);
      },

      cleanup: function() {
        var i = (s.diseases.length - 1);
        while (i < s.diseases.length && i > -1) {
          // console.log(s.diseases[i]);
          var vaccineCount = s.diseases[i].periods.length;
          if (vaccineCount === 0) {
            calendar.output.invalidCols.push(i);
          }
          i--;
        }
      },

      write: function() {
        // initiate the tables
        // add title table
        var animal = s.animal;
        var birthSeasonDisplayName = s.birthSeasonName;
        var breedingSeasonDisplayName = s.breedingSeasonName;
        if (animal === 'replacementHeifers') {
          animal = 'Replacement Heifers';
        }
        if (birthSeasonDisplayName === 'allYear') {
          birthSeasonDisplayName = 'All Year';
        }
        if (breedingSeasonDisplayName === 'allYear') {
          breedingSeasonDisplayName = 'All Year';
        }

        var op = '';
        op += '<table class="print-calendar-header"><tr><td class="header-td"><h1 class="output-title"><span class="bovilis-logo">Bovilis&reg; </span><br>Vaccination Calendar ';
        op += s.initialYear + ' - ' + (s.initialYear + 1) + '</h1></td>';
        op += '<td class="header-td header-right" style="text-align: right;"><p class="table-details">' + animal + ', ' + s.enterprise;
        if (s.enterprise === 'sheep') {
          op += ' flock';
        } else {
          op += ' herd';
        }

        if (s.birthSeason === true) {
          op += '<br>' + birthSeasonDisplayName + ' ' + s.birthSeasonTitle + ' (' + s.birthDate.toLocaleString() + ')';
        }
        if (s.breedingSeason === true) {
          op += '<br>' + breedingSeasonDisplayName + ' '+ s.breedingSeasonTitle + ' (' + s.breedingDate.toLocaleString() + ')';
        }
        op += '<br></td></tr></table>';

        for (var year = 0; year < 2; year++) {
          // check year
          renderYear = s.initialYear + year;
          /// add table heading (year + disease names)
          op += '<table data-year="' + renderYear + '" class="calendar-table" style="border-collapse: collapse; width: 100%"><tr><th class="cal-heading-td month-td" style="width: 90px;"><strong>' + renderYear + '</strong></th>';
          for (var i = 0; i < s.diseases.length; i++) {
            if (calendar.output.invalidCols.indexOf(i) === -1) {
              op += '<th class="cal-heading-td" class="border-left-width: 1px; border-left-color: #99d3d2;"><strong>' + s.diseases[i].name.toUpperCase() + '</strong></th>';
            }
          }
          op += '</tr>';

          // render table rows (months)
          for (var j = 0; j < 12; j++) {
            var monthIndex = j;
            if (year === 1) {
              monthIndex = j + 12;
            }
            if ((year === 0 && j >= (s.currentMonth - 1)) || year === 1) {
              op += '<tr class="vaccine-row" data-month="' + j + '">';
              op += '<td class="month-td ct-td" style="width: 90px; font-weight: bold; border-top-width: 1px; border-top-color: #dbe3e1;">' + s.months[j] + '</td>';
              for (var k = 0; k < s.diseases.length; k++) {
                if (calendar.output.invalidCols.indexOf(k) === -1) {
                  op += '<td class="ct-td" data-disease="' + s.diseases[k].slug + '" style="border-top-width: 1px; border-top-color: #dbe3e1; border-left-width: 1px; border-left-color: #99d3d2; padding: 0;">';
                  for (var l = 0; l < s.diseases[k].periods.length; l++) {
                    var periodDate = s.diseases[k].periods[l].d;
                    var periodCycle = s.diseases[k].periods[l].cycle;
                    var y = periodDate.getFullYear();
                    var m = periodDate.getMonth();
                    var d = periodDate.getDate();
                    if ((y === renderYear) && (m === j)) {
                      var monthName = s.monthsAbbr[m];
                      op += '<div class="vaccine-period" style="margin-bottom: 0 !important; marign-top: 0; width: 100%; display: inline-block; padding: 4px;';
                      if (periodCycle === -1) {
                        op += ' opacity: 0.5';
                      }
                      op +='">' + s.diseases[k].vaccine + ' | ' + monthName + ' ' + d + ', ' + s.initialYear;
                      if (periodCycle === -1) {
                        op += ' (Prev Year)';
                      }
                      op += '</div>';
                      if ((renderYear === (s.initialYear)) && (monthIndex >= 12)) {
                        break;
                      }
                    }
                  }
                  op += '</td>';
                }
              }
              op += '</tr>';
            }
          }
          op += '</table>';
        }

        // add footer
        op += '<p class="footer-p" style="margin-top: 7px;"><span style="font-size: 14px; line-height: 10px;">Use Medicines Responsibly.</span> <br>';
        op += '<span class="info" style="font-size: 10px; line-height: 8px; margin: 0; color: #000; font-weight: 400 !important;">For further information see SPC, contact prescriber or MSD Animal Health, Red Oak North, South County Business Park, Leopardstown, Dublin 18, Ireland. <br>Tel: +353(0)1 2970220. E-Mail: vet-support.ie@merck.com. | IE/BBR/0616/0006 September 2016</span>';
        op += '<br><span class="inline-block">Created&nbsp;by&nbsp;<strong>Bovilis&nbsp;Vaccination&nbsp;Builder</strong>&nbsp;|&nbsp;www.bovilis.ie |</span> <span class="copyright inline-block">&copy;&nbsp;' + s.initialYear + ' Bovilis</span></p>';

        return op;
      },

      publish: function(outputHTML) {
        $('#calendar-container').html(outputHTML);
      },

      unpublish: function(e) {
        $('#calendar-container').html(e);
        $('.back-to-edit-mode').fadeOut(200);
      }

    },
  };
