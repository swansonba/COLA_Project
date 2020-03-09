const db = require('./db_functions.js');
const tm = require('./template_manip.js');
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
	user: 'gunrock2018@gmail.com',
	pass: 'iamaweimaraner'
    }
});

module.exports = {
    /* name: send_emails
       preconditions: changed_rates contains array of objects that contains each
                      post that has changed cola rate, including information db id,
		      country, post, previous_allowance, and allowance (new allowance)
       postconditions: emails have been sent to all users subscribed to posts
                       whose rates have changed
       description:
     */
    start_sending_emails: function(changed_rates){
	changed_rates.forEach(changed => {
	    try{
		db.get_users_subscribed_to_post(changed.post, changed.country)
		    .then(users => users.forEach(user => {
			let file_info = tm.manip_template(user.username,
					  user.filename,
					  changed.post,
					  changed.country,
					  changed.previous_allowance,
							  changed.allowance);
			send_email(user.username, file_info.filename, file_info.filepath)
			    .then((res) => {
				console.log(`Email sent to ${user.username} with '${file_info.filename}'`
					    + ` attached. ${changed.post}, ${changed.country}: `
				 	   + `prev_rate: ${changed.previous_allowance}, `
					    + `new_rate: ${changed.allowance}`);
			    })
			    .catch(err => {
				throw 'Error sending email';
			    })
			
		    }))
	    }
	    catch(err){
		console.log(err);
		console.log(`Error: unable to send emails for `
			    + `${changed.post}, ${changed.country}.`);
	    }
	});
	
    }
}

/*
  name: send_email
  preconditions: username is valid user email
                 filename is name of file that we will be sending to user. filename 
		 has already been creaed in server/templates/temp/${filename}
  postconditions: email has been sent to user with attachment
  description:
*/
function send_email(username, filename, filepath){
    return new Promise((resolve, reject) => {
	console.log(`trying to send ${filename} from ${__dirname}/${filepath}`);
	
	const mail_options = {
	    from: 'gunrock2018@gmail.com',
	    to: username,
	    subject: 'Hello there',
	    html: '<p>hello, see attachment</p>',
	    attachments: [
		{
		    filename: filename,
		    content: 'Buffer',
		    path: `${__dirname}/${filepath}/${filename}`
		}
	    ]   
	}
	console.log('mail option path = ' + mail_options.attachments[0].path);
	console.log('mail option filename = ' + mail_options.attachments[0].filename);
	
	transporter.sendMail(mail_options)
	    .then(res => {
		console.log(res)
		resolve(res);
	    })
	    .catch(err => {
		console.log(err)
		reject(err);
	    })
    });
}

