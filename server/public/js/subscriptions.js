const LINESPACING = 10;
document.addEventListener('DOMContentLoaded', async () => {
    let subscription_list = fetch_user_subscription_list();

    await subscription_list;
    set_window_prefs();
});
function set_window_prefs(){
    size_table();
    let in_progress = false;
    window.addEventListener('resize', () => {
	if(!in_progress){
	    in_progress = true;
	    setTimeout(() => {
		size_table();
		in_progress = false;
	    }, 100);	    
	}	
    })
}
function size_table(){
    let size = $('#subscriptionsTable')[0].clientHeight;

    if(size > (0.6 * window.innerHeight)) size = 0.6 * window.innerHeight;
    if(size < 200) size = 200;
    
    document.getElementById('subscriptionsContainer')
	.setAttribute('style', `max-height:${size}px`);
}

function clear_user_subscriptions(){
    let tbody = document.getElementById('subscriptionTbody');
    while(tbody.firstChild)
	tbody.removeChild(tbody.firstChild);
}



function new_subscription_success(post_id){
    let msg_div = document.getElementById('addSubscriptionMessageDiv');

    let pop = $('#submitNewSubscription');
    
    for (let [num, option] of Object.entries($('#searchPosts option'))) {
	if(option.getAttribute('data-COLARatesId') == post_id){
	    pop[0].setAttribute('data-content', `New subscription added: ${option.innerText}`);
	    show_popover(pop, 4000, 'green')
	    return;
	}
    }
}

function validate_subscription(){
    let valid = false;
    const posts = document.getElementById('searchPosts');
    const upTemp = document.getElementById('uploadTemplate');
    const prevTemp = document.getElementById('choosePreviousTemplate');
    let buttonPop = document.getElementById('submitNewSubscription');
    
    let reg = /(\.doc|\.docx)$/i;
    
    if(posts.selectedIndex === 0){
	buttonPop.setAttribute('data-content', '1. Must select a post.');
	set_error_border(posts);
    }
    else if(!upTemp.value && prevTemp.selectedIndex === 0){
	buttonPop.setAttribute('data-content', '2. Must choose a template.');
	set_error_border(upTemp);
	set_error_border(prevTemp);
    }
    else if(!reg.exec(upTemp.value)
	    && !reg.exec(prevTemp[prevTemp.selectedIndex].value)){
		//check if ending of file is not .doc or .doc
	buttonPop.setAttribute('data-content', 'Unsupported file type');
	if(upTemp.value) set_error_border(upTemp);
	else if(prevTemp.value) set_error_border(prevTemp);
    }
    else{ //otherwise the post/file combo looks fine to upload
	valid = true;
    }

    if(!valid){
	let pop = $('#submitNewSubscription');
	show_popover(pop, 4000, 'red');
    }
    return valid;
}

